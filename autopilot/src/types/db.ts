export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DeploymentStatus =
  | "pending"
  | "coding"
  | "testing"
  | "passed"
  | "failed"
  | "deployed";

export type TaskStatus = "pending" | "approved" | "rejected" | "analyzed";

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          github_repo_url: string;
          doc_urls: string[] | null;
          problem_description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          github_repo_url: string;
          doc_urls?: string[] | null;
          problem_description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          github_repo_url?: string;
          doc_urls?: string[] | null;
          problem_description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string | null;
          title: string;
          description: string | null;
          status: TaskStatus | null;
          clarifying_question: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          title: string;
          description?: string | null;
          status?: TaskStatus | null;
          clarifying_question?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          title?: string;
          description?: string | null;
          status?: TaskStatus | null;
          clarifying_question?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      code_artifacts: {
        Row: {
          id: string;
          task_id: string | null;
          file_path: string;
          unified_diff: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          file_path: string;
          unified_diff: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string | null;
          file_path?: string;
          unified_diff?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      deployments: {
        Row: {
          id: string;
          project_id: string | null;
          status: DeploymentStatus | null;
          pr_link: string | null;
          branch_name: string | null;
          commit_sha: string | null;
          retry_count: number | null;
          test_output: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          status?: DeploymentStatus | null;
          pr_link?: string | null;
          branch_name?: string | null;
          commit_sha?: string | null;
          retry_count?: number | null;
          test_output?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          status?: DeploymentStatus | null;
          pr_link?: string | null;
          branch_name?: string | null;
          commit_sha?: string | null;
          retry_count?: number | null;
          test_output?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type CodeArtifactRow = Database["public"]["Tables"]["code_artifacts"]["Row"];
export type DeploymentRow = Database["public"]["Tables"]["deployments"]["Row"];
