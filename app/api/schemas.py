from pydantic import BaseModel, Field, HttpUrl


class StatusResponse(BaseModel):
    status: str
    message: str


class IngestRequest(BaseModel):
    project_id: str | None = None
    repo_url: HttpUrl | None = None
    doc_urls: list[HttpUrl] = Field(default_factory=list)
    raw_text: str | None = None


class AnalyzeRequest(BaseModel):
    project_id: str
    query: str


class RunRequest(BaseModel):
    project_id: str
    task_id: str


class DeployRequest(BaseModel):
    project_id: str
    task_id: str
