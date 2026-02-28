import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Save, Upload, X, Loader2 } from "lucide-react";

interface EmailTemplate {
  id: string;
  template_type: string;
  subject: string;
  body_html: string;
  attachment_url: string | null;
  attachment_filename: string | null;
  updated_at: string;
}

const PLACEHOLDERS = [
  { key: "{{user_name}}", desc: "Username" },
  { key: "{{email}}", desc: "Email address" },
  { key: "{{password}}", desc: "Temporary password" },
  { key: "{{full_name}}", desc: "Full name" },
  { key: "{{member_number}}", desc: "Member number" },
];

const htmlToPlainText = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const plainTextToHtml = (text: string): string => {
  return text
    .split("\n")
    .map((line) => (line.trim() ? `<p>${line}</p>` : ""))
    .filter(Boolean)
    .join("\n");
};

const EmailTemplateEditor = () => {
  const { toast } = useToast();
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentFilename, setAttachmentFilename] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_templates" as any)
        .select("*")
        .eq("template_type", "welcome")
        .single();

      if (error) throw error;

      const t = data as any as EmailTemplate;
      setTemplate(t);
      setSubject(t.subject);
      setBodyHtml(htmlToPlainText(t.body_html));
      setAttachmentUrl(t.attachment_url);
      setAttachmentFilename(t.attachment_filename);
    } catch (err: any) {
      console.error("Error fetching template:", err);
      toast({
        title: "Error loading template",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("email_templates" as any)
        .update({
          subject,
          body_html: plainTextToHtml(bodyHtml),
          attachment_url: attachmentUrl,
          attachment_filename: attachmentFilename,
          updated_by: user?.id,
        } as any)
        .eq("id", template.id);

      if (error) throw error;

      toast({ title: "Template saved", description: "Welcome email template updated successfully." });
      fetchTemplate();
    } catch (err: any) {
      toast({ title: "Error saving template", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Max file size is 5MB.", variant: "destructive" });
      return;
    }

    const allowed = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only PDF, PNG, and JPG files are allowed.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `welcome/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("email-attachments")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("email-attachments")
        .getPublicUrl(filePath);

      setAttachmentUrl(urlData.publicUrl);
      setAttachmentFilename(file.name);
      toast({ title: "File uploaded", description: `${file.name} uploaded successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentUrl(null);
    setAttachmentFilename(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading template...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Welcome Email Template
        </CardTitle>
        <CardDescription>
          Customize the email sent to new users when their account is created.
          {template?.updated_at && (
            <span className="block text-xs mt-1">
              Last saved: {new Date(template.updated_at).toLocaleString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Placeholders */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Available placeholders:</Label>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <Badge key={p.key} variant="secondary" className="text-xs font-mono cursor-pointer"
                onClick={() => navigator.clipboard.writeText(p.key).then(() => toast({ title: "Copied", description: `${p.key} copied to clipboard.` }))}
                title={`Click to copy — ${p.desc}`}
              >
                {p.key}
              </Badge>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="email-subject">Subject</Label>
          <Input
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Welcome to..."
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="email-body">Message</Label>
          <Textarea
            id="email-body"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            className="min-h-[200px]"
            placeholder="Type your welcome message here..."
          />
        </div>

        {/* Attachment */}
        <div className="space-y-2">
          <Label>Attachment (optional)</Label>
          {attachmentFilename ? (
            <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
              <span className="text-sm truncate flex-1">{attachmentFilename}</span>
              <Button variant="ghost" size="sm" onClick={handleRemoveAttachment}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div>
              <Button variant="outline" size="sm" asChild disabled={isUploading}>
                <label className="cursor-pointer">
                  {isUploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  {isUploading ? "Uploading..." : "Upload file"}
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PDF, PNG, or JPG — max 5MB</p>
            </div>
          )}
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          {isSaving ? "Saving..." : "Save Template"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateEditor;
