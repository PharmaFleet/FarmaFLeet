import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-lg text-muted-foreground mb-8">Page not found</p>
      <Button onClick={() => navigate("/")}>
        Go Home
      </Button>
    </div>
  );
}
