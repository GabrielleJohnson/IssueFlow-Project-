export type AttachmentRecord = {
  id: number;
  filename: string;
  original_name: string;
  mimetype: string;
  filesize: number;
  uploaded_by: number;
  issue_id: number;
  created_at: string;
  uploader: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
};

