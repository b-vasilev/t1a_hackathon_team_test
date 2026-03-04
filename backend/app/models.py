from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    website_url: Mapped[str] = mapped_column(String, nullable=False)
    privacy_policy_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False)
    icon: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    analyses: Mapped[list["PolicyAnalysis"]] = relationship(
        "PolicyAnalysis", back_populates="service", cascade="all, delete-orphan"
    )


class PolicyAnalysis(Base):
    __tablename__ = "policy_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    service_id: Mapped[int] = mapped_column(Integer, ForeignKey("services.id"), nullable=False)
    grade: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    red_flags: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON
    warnings: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON
    categories: Mapped[str] = mapped_column(Text, default="{}")  # JSON
    highlights: Mapped[str] = mapped_column(Text, default="[]")  # JSON
    positives: Mapped[str] = mapped_column(Text, default="[]")  # JSON
    analyzed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    service: Mapped["Service"] = relationship("Service", back_populates="analyses")
