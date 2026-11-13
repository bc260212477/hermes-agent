import { useCallback, useEffect, useState } from "react";
import { FolderGit2, FolderOpen, RefreshCw, Rocket, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { Badge } from "@nous-research/ui/ui/components/badge";
import { Button } from "@nous-research/ui/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@nous-research/ui/ui/components/card";
import { Input } from "@nous-research/ui/ui/components/input";
import { Spinner } from "@nous-research/ui/ui/components/spinner";
import { api, type ChatWorkspaceProject, type ChatWorkspaceRepo } from "@/lib/api";
import { abbreviateHomePath, writeStoredWorkspace } from "@/lib/chat-workspaces";
import { useProfileScope } from "@/contexts/useProfileScope";

type Project = ChatWorkspaceProject & { kind: "project" };
type Repository = ChatWorkspaceRepo & { kind: "repository" };
type Workspace = Project | Repository;

function workspacePath(workspace: Workspace): string {
  if (workspace.kind === "repository") return workspace.root;
  return workspace.primary_path ?? workspace.folders[0]?.path ?? "";
}

function workspaceLabel(workspace: Workspace): string {
  return workspace.kind === "repository" ? workspace.label : workspace.name;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { profile } = useProfileScope();
  const [projects, setProjects] = useState<Workspace[]>([]);
  const [home, setHome] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getChatWorkspaces(profile, true);
      setHome(data.home);
      setProjects([
        ...data.projects.filter((project) => !project.archived).map((project) => ({ ...project, kind: "project" as const })),
        ...data.repos.map((repo) => ({ ...repo, kind: "repository" as const })),
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = projects.filter((project) => {
    const text = `${workspaceLabel(project)} ${workspacePath(project)}`.toLowerCase();
    return text.includes(query.toLowerCase().trim());
  });

  const openProject = (workspace: Workspace) => {
    const path = workspacePath(workspace);
    if (!path) return;
    writeStoredWorkspace(profile, path);
    navigate("/chat");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-text-tertiary">Workspace control center</p>
            <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
            <p className="mt-1 text-sm text-text-secondary">Choose a codebase and launch Hermes directly into it.</p>
          </div>
          <Button ghost onClick={() => void load()} disabled={loading} aria-label="Refresh projects">
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="mb-5 max-w-xl">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects and repositories" aria-label="Search projects and repositories" />
          <Search className="pointer-events-none relative -top-8 left-3 h-4 w-4 text-text-tertiary" />
        </div>

        {error && <Card className="mb-5 border-destructive/50"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>}
        {loading && <div className="flex min-h-48 items-center justify-center"><Spinner /></div>}
        {!loading && !error && visible.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-text-secondary">No matching workspaces found.</CardContent></Card>
        )}
        {!loading && visible.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((workspace) => {
              const path = workspacePath(workspace);
              const repo = workspace.kind === "repository";
              return (
                <Card key={`${workspace.kind}:${repo ? workspace.root : workspace.id}`} className="group border-border/70 transition-colors hover:border-midground/60">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-midground/10 p-2 text-midground">
                        {repo ? <FolderGit2 className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{workspaceLabel(workspace)}</CardTitle>
                        <p className="mt-1 truncate text-xs text-text-tertiary">{abbreviateHomePath(path, home)}</p>
                      </div>
                    </div>
                    <Badge tone="outline">{repo ? `${workspace.sessions} sessions` : "Project"}</Badge>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-text-secondary">{path || "No folder configured"}</span>
                    <Button size="sm" onClick={() => openProject(workspace)} disabled={!path}>
                      <Rocket className="h-4 w-4" />
                      Open
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
