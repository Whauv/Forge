from pydantic import BaseModel, Field


class StatusResponse(BaseModel):
    status: str
    message: str


class IngestRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    repo_url: str | None = None
    doc_urls: list[str] | None = None
    raw_text: str | None = None


class AnalyzeRequest(BaseModel):
    project_id: str
    query: str


class RunRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    task_id: str = Field(..., min_length=1)


class DeployRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    task_id: str = Field(..., min_length=1)


class WorkflowRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    repo_url: str | None = None
    user_query: str | None = None
    doc_urls: list[str] | None = None
    raw_text: str | None = None
