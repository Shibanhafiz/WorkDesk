import { Suspense } from "react";
import { notFound } from "next/navigation";
import ProjectDetails from "../../components/ProjectDetails";
import { prisma } from "../../lib/prisma";
import { isValidProjectId } from "../../lib/projectValidation";

export default function ProjectPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="page-frame">
          <p role="status" className="state-panel">
            Loading project...
          </p>
        </div>
      }
    >
      <ProjectPageContent params={params} />
    </Suspense>
  );
}

async function ProjectPageContent({ params }) {
  const { id } = await params;
  if (!isValidProjectId(id)) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
        include: {
          project: {
            select: { id: true, name: true, status: true },
          },
        },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!project) {
    notFound();
  }

  return <ProjectDetails initialProject={project} />;
}
