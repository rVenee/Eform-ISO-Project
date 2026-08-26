from sqlalchemy import Column, Integer, String, Enum, Date, JSON, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "USERS"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(Enum('admin_iso', 'user'), nullable=False)

    # Menghubungkan User dengan dokumen dan log revisinya
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    revisions = relationship("RevisionLog", back_populates="reviewer", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "DOCUMENTS"

    document_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("USERS.user_id", ondelete="CASCADE"), nullable=False)
    creator_name = Column(String(100), nullable=True)
    checked_by = Column(String(100), nullable=True)
    approved_by = Column(String(100), nullable=True)
    category = Column(Enum('WI', 'SOP', 'QM', 'FM_FR', 'Others'), nullable=False)
    title = Column(String(255), nullable=False)
    document_number = Column(String(100), nullable=True)
    revision_number = Column(String(50), nullable=True)
    effective_date = Column(Date, nullable=True)
    status = Column(Enum('Draft', 'Menunggu', 'Direview', 'Disetujui', 'Direvisi'), default='Draft')
    created_date = Column(TIMESTAMP, server_default=func.now())
    updated_date = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relasi dua arah
    owner = relationship("User", back_populates="documents")
    contents = relationship("DocumentContent", back_populates="document", cascade="all, delete-orphan")
    attachments = relationship("DocumentAttachment", back_populates="document", cascade="all, delete-orphan")
    revisions = relationship("RevisionLog", back_populates="document", cascade="all, delete-orphan")

class DocumentContent(Base):
    __tablename__ = "DOCUMENTS_CONTENTS"

    content_id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("DOCUMENTS.document_id", ondelete="CASCADE"), nullable=False)
    form_data = Column(JSON, nullable=False)

    document = relationship("Document", back_populates="contents")

class DocumentAttachment(Base):
    __tablename__ = "DOCUMENTS_ATTACHMENTS"

    attachment_id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("DOCUMENTS.document_id", ondelete="CASCADE"), nullable=False)
    subchapter_reference = Column(String(100), nullable=False)
    file_path = Column(String(255), nullable=False)
    upload_date = Column(TIMESTAMP, server_default=func.now())

    document = relationship("Document", back_populates="attachments")

class RevisionLog(Base):
    __tablename__ = "REVISION_LOGS"

    log_id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("DOCUMENTS.document_id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("USERS.user_id", ondelete="CASCADE"), nullable=False)
    notes = Column(Text, nullable=False)
    date_create = Column(TIMESTAMP, server_default=func.now())

    document = relationship("Document", back_populates="revisions")
    reviewer = relationship("User", back_populates="revisions")