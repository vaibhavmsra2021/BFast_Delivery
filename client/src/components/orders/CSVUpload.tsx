import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideUpload, AlertCircle, FileCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CSVUploadProps {
  title?: string;
  description: string;
  onUpload: (file: File) => void;
  templateUrl?: string;
  isLoading?: boolean;
}

export function CSVUpload({
  title,
  description,
  onUpload,
  templateUrl,
  isLoading = false,
}: CSVUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      setSuccess(false);

      if (acceptedFiles.length === 0) {
        setError("No file was uploaded");
        return;
      }

      const file = acceptedFiles[0];

      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        setError("Please upload a valid CSV file");
        return;
      }

      setSuccess(true);
      onUpload(file);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  return (
    <div className="max-w-3xl mx-auto">
      {title && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
      )}
      {!title && description && (
        <div className="mb-6">
          <p className="text-muted-foreground">{description}</p>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
          ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-primary/5"}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <LucideUpload className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">
              {isDragActive
                ? "Drop the CSV file here"
                : "Drag and drop a CSV file here, or click to select"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Only CSV files are accepted
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && !isLoading && (
        <Alert className="mt-4 bg-green-50">
          <FileCheck className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Success</AlertTitle>
          <AlertDescription>File uploaded successfully</AlertDescription>
        </Alert>
      )}

      {templateUrl && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-medium">Need a template?</h3>
                <p className="text-sm text-muted-foreground">
                  Download our CSV template to ensure your data is formatted correctly
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href={templateUrl} download>
                  Download Template
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}