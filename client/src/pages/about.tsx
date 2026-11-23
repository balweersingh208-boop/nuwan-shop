import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { businessSettingsFormSchema, type BusinessSettings } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Building2, Upload, Save, Loader2, Image, FileSignature, CreditCard, Database } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function About() {
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<BusinessSettings>({
    resolver: zodResolver(businessSettingsFormSchema),
    defaultValues: {
      brandName: "The Moon Shoes & Slippers",
      brandLogo: "https://raw.githubusercontent.com/moon07k/moon/refs/heads/main/Moon.png",
      taxPercent: 18,
      address: "Peshwa Nagar, Bithoor, Kanpur Nagar, Uttar Pradesh, 209217",
      mobile: "9140886277",
      email: "khanrazzak1204@gmail.com",
      signature: "https://raw.githubusercontent.com/moon07k/moon/refs/heads/main/Nihal2.png",
      upiId: "",
      supabaseUrl: "",
      supabaseAnonKey: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
      if (settings.brandLogo) {
        setLogoPreview(settings.brandLogo);
      }
      if (settings.signature) {
        setSignaturePreview(settings.signature);
      }
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<BusinessSettings>) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings saved",
        description: "Your business settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: "brandLogo" | "signature"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (field === "brandLogo") {
        setLogoPreview(base64);
        form.setValue("brandLogo", base64);
      } else {
        setSignaturePreview(base64);
        form.setValue("signature", base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: BusinessSettings) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">About / Settings</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brand Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="brandName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your brand name"
                        data-testid="input-brand-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Brand Logo</Label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 border border-dashed rounded-md flex items-center justify-center bg-muted/50 overflow-hidden shrink-0">
                      {logoPreview || settings?.brandLogo ? (
                        <img
                          src={logoPreview || settings?.brandLogo || ""}
                          alt="Brand Logo"
                          className="h-full w-full object-contain"
                          data-testid="img-brand-logo"
                        />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          data-testid="button-upload-logo"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload File
                        </Button>
                        <span className="text-xs text-muted-foreground">or</span>
                        <FormField
                          control={form.control}
                          name="brandLogo"
                          render={({ field }) => (
                            <div className="flex-1">
                              <Input
                                placeholder="Paste image URL here"
                                value={field.value || ""}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  setLogoPreview(e.target.value);
                                }}
                                className="h-8 text-xs"
                                data-testid="input-logo-url"
                              />
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "brandLogo")}
                    data-testid="input-logo-file"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your business address"
                        className="resize-none"
                        rows={3}
                        data-testid="input-address"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1234567890"
                          data-testid="input-mobile"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          data-testid="input-email"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Supabase Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="supabaseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://your-project.supabase.co"
                        data-testid="input-supabase-url"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supabaseAnonKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anon Public Key</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="your-anon-key"
                        data-testid="input-supabase-key"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                UPI Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="upiId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPI ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="yourshop@upi"
                        data-testid="input-upi-id"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">
                      This UPI ID will be shown on invoices and payment reminders
                    </p>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Owner/Manager Signature</Label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-40 border border-dashed rounded-md flex items-center justify-center bg-muted/50 overflow-hidden shrink-0">
                      {signaturePreview || settings?.signature ? (
                        <img
                          src={signaturePreview || settings?.signature || ""}
                          alt="Signature"
                          className="h-full w-full object-contain"
                          data-testid="img-signature"
                        />
                      ) : (
                        <FileSignature className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => signatureInputRef.current?.click()}
                          data-testid="button-upload-signature"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload File
                        </Button>
                        <span className="text-xs text-muted-foreground">or</span>
                        <FormField
                          control={form.control}
                          name="signature"
                          render={({ field }) => (
                            <div className="flex-1">
                              <Input
                                placeholder="Paste signature URL here"
                                value={field.value || ""}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  setSignaturePreview(e.target.value);
                                }}
                                className="h-8 text-xs"
                                data-testid="input-signature-url"
                              />
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "signature")}
                    data-testid="input-signature-file"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
