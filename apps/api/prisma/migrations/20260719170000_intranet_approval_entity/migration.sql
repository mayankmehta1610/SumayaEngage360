-- Route intranet publishing through the approval workflow engine.
ALTER TYPE "ApprovalEntity" ADD VALUE IF NOT EXISTS 'INTRANET_CONTENT';
