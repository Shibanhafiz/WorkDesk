import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireWorkspaceMember } from "@/app/lib/session";
import {
  generateInvitationToken,
  getDefaultExpiryDate,
} from "@/app/lib/invitationToken";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";
import { SPECIALIZATIONS } from "@/app/lib/workspacePermissions";
import { isJsonObjectBody } from "@/app/lib/requestBody";

const validRoles = ["MEMBER", "MANAGER", "ADMIN"];

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await requireWorkspaceMember(prisma, id, "ADMIN");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const invitations = await prisma.invitation.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, token: true, email: true, role: true,
        specialization: true, expiresAt: true,
        acceptedAt: true, rejectedAt: true, createdAt: true,
      },
    });
    return Response.json(invitations);
  } catch (error) {
    logApiError("Invitation", "load", error);
    return errorResponse("Unable to load invitations. Please try again.", 500);
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  const access = await requireWorkspaceMember(prisma, id, "MANAGER");
  if (access.error) return errorResponse(access.error, access.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (!isJsonObjectBody(body)) {
    return errorResponse("Request body must be a JSON object.", 400);
  }

  const { role } = body;
  if (!validRoles.includes(role)) {
    return errorResponse("Invalid role. Must be MEMBER, MANAGER, or ADMIN.", 400);
  }
  if (role === "ADMIN" && access.role !== "ADMIN") {
    return errorResponse("Only workspace admins can invite other admins.", 403);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse("Enter a valid email address.", 400);
  }
  const specialization =
    body.specialization && SPECIALIZATIONS[body.specialization]
      ? body.specialization
      : null;

  try {
    const invitation = await prisma.$transaction(async (tx) => {
      if (email) {
        const duplicate = await tx.invitation.findFirst({
          where: {
            workspaceId: id,
            email,
            acceptedAt: null,
            rejectedAt: null,
            expiresAt: { gt: new Date() },
          },
        });
        if (duplicate) {
          return { duplicate: true };
        }
      }

      const created = await tx.invitation.create({
        data: {
          token: generateInvitationToken(),
          workspaceId: id,
          email: email || null,
          role,
          specialization,
          invitedById: access.userId,
          expiresAt: getDefaultExpiryDate(),
        },
      });

      await recordActivity(tx, {
        workspaceId: id,
        actorId: access.userId,
        type: ACTIVITY_TYPES.INVITATION_SENT,
        targetId: created.id,
        targetType: "INVITATION",
        metadata: { email: created.email, role, specialization },
      });

      return { invitation: created };
    });

    if (invitation.duplicate) {
      return errorResponse("An active invitation already exists for this email.", 409);
    }

    const created = invitation.invitation;
    const token = created.token;
    const webhookUrl = process.env.INVITATION_WEBHOOK_URL;
    let delivered = false;
    if (webhookUrl && email) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            token,
            role,
            workspaceId: id,
            expiresAt: created.expiresAt,
          }),
        });
        delivered = response.ok;
        if (!delivered) {
          logApiError("Invitation", "delivery", new Error(`Webhook status ${response.status}`));
        }
      } catch (error) {
        logApiError("Invitation", "delivery", error);
      }
    }

    return Response.json(
      {
        id: created.id,
        token: created.token,
        email: created.email,
        role: created.role,
        specialization: created.specialization,
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
        delivered,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error && typeof error === "object" && error.code === "P2002") {
      return errorResponse("An active invitation already exists for this email.", 409);
    }
    logApiError("Invitation", "create", error);
    return errorResponse("Unable to create invitation. Please try again.", 500);
  }
}
