import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  Filter,
  X,
} from "lucide-react";
import { insertProductSchema, type Product, type InsertProduct, type ProductWithVariants, type ProductVariant } from "@shared/schema";
import { ImageCarousel } from "@/components/ImageCarousel";
import { z } from "zod";

const productFormSchema = insertProductSchema.extend({
  name: z.string().min(1, "Name is required"),
  brand: z.string().min(1, "Brand is required"),
  size: z.string().min(1, "Size is required"),
  color: z.string().min(1, "Color is required"),
  price: z.coerce.number().min(0.01, "Price must be positive"),
  stock: z.coerce.number().min(0, "Stock cannot be negative"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().nullable().optional(),
});

const CATEGORIES = ["Men", "Women", "Kids", "Sports", "Casual", "Formal"];
const SIZES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];
const COLORS = ["Black", "White", "Brown", "Blue", "Red", "Grey", "Beige", "Multi"];

interface SizeStock {
  size: string;
  stock: number;
  variantId?: string;
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingProduct, setEditingProduct] = useState<ProductWithVariants | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductWithVariants | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<ProductWithVariants[]>({
    queryKey: ["/api/products/with-variants"],
  });

  const addProductMutation = useMutation({
    mutationFn: async (data: { product: InsertProduct; variants: SizeStock[] }) => {
      const response = await apiRequest("POST", "/api/products", data.product);
      const newProduct = await response.json() as Product;
      
      for (const variant of data.variants) {
        await apiRequest("POST", `/api/products/${newProduct.id}/variants`, {
          productId: newProduct.id,
          size: variant.size,
          stock: variant.stock,
        });
      }
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-variants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsAddDialogOpen(false);
      toast({ title: "Success", description: "Product added successfully." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add product.",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data, variants }: { id: string; data: Partial<InsertProduct>; variants: SizeStock[] }) => {
      await apiRequest("PATCH", `/api/products/${id}`, data);
      
      const existingVariants = editingProduct?.variants || [];
      const existingVariantIds = new Set(existingVariants.map(v => v.id));
      const newVariantIds = new Set(variants.filter(v => v.variantId).map(v => v.variantId));
      
      for (const oldVariant of existingVariants) {
        if (!newVariantIds.has(oldVariant.id)) {
          await apiRequest("DELETE", `/api/products/${id}/variants/${oldVariant.id}`);
        }
      }
      
      for (const variant of variants) {
        if (variant.variantId && existingVariantIds.has(variant.variantId)) {
          await apiRequest("PATCH", `/api/products/${id}/variants/${variant.variantId}`, {
            size: variant.size,
            stock: variant.stock,
          });
        } else {
          await apiRequest("POST", `/api/products/${id}/variants`, {
            productId: id,
            size: variant.size,
            stock: variant.stock,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-variants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setEditingProduct(null);
      toast({ title: "Success", description: "Product updated successfully." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update product.",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/with-variants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setDeletingProduct(null);
      toast({ title: "Success", description: "Product deleted successfully." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    },
  });

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = products?.filter((p) => p.stock <= 1).length || 0;

  return (
    <div className="p-6 space-y-6" data-testid="page-inventory">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Inventory</h1>
          <p className="text-muted-foreground">
            {products?.length || 0} products total
            {lowStockCount > 0 && (
              <span className="text-destructive ml-2">
                ({lowStockCount} low stock)
              </span>
            )}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-product">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <ProductForm
              onSubmit={(data, variants) => addProductMutation.mutate({ product: data, variants })}
              isLoading={addProductMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-products"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={`overflow-visible ${product.stock <= 1 ? "border-destructive/50" : ""}`}
                data-testid={`card-product-${product.id}`}
              >
                <CardContent className="p-4">
                  {(product.imageUrls || product.imageUrl) && (
                    <div className="mb-3">
                      {(() => {
                        const images = product.imageUrls 
                          ? JSON.parse(product.imageUrls) as string[]
                          : product.imageUrl ? [product.imageUrl] : [];
                        return images.length > 0 ? (
                          <ImageCarousel 
                            images={images} 
                            alt={product.name} 
                            height="h-32"
                          />
                        ) : null;
                      })()}
                    </div>
                  )}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.brand}</p>
                    </div>
                    {product.stock <= 1 && (
                      <Badge variant="destructive" className="shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline">{product.color}</Badge>
                    <Badge variant="secondary">{product.category}</Badge>
                  </div>

                  {product.variants && product.variants.length > 0 ? (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Sizes Available:</p>
                      <div className="flex flex-wrap gap-1">
                        {product.variants.map((v) => (
                          <Badge 
                            key={v.id} 
                            variant={v.stock <= 1 ? "destructive" : "outline"} 
                            className="text-xs"
                          >
                            {v.size}: {v.stock}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline">Size {product.size}</Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold">
                      ₹{product.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Total: {product.stock}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingProduct(product)}
                      data-testid={`button-edit-${product.id}`}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeletingProduct(product)}
                      data-testid={`button-delete-${product.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Add your first product to get started</p>
          </div>
        )}
      </ScrollArea>

      <Dialog
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              defaultValues={editingProduct}
              existingVariants={editingProduct.variants}
              onSubmit={(data, variants) =>
                updateProductMutation.mutate({ id: editingProduct.id, data, variants })
              }
              isLoading={updateProductMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingProduct}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingProduct && deleteProductMutation.mutate(deletingProduct.id)
              }
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ProductFormProps {
  defaultValues?: Partial<InsertProduct>;
  existingVariants?: ProductVariant[];
  onSubmit: (data: InsertProduct, variants: SizeStock[]) => void;
  isLoading?: boolean;
}

function ProductForm({ defaultValues, existingVariants, onSubmit, isLoading }: ProductFormProps) {
  const getInitialImages = (): string[] => {
    if (defaultValues?.imageUrls) {
      try {
        return JSON.parse(defaultValues.imageUrls);
      } catch { return []; }
    }
    if (defaultValues?.imageUrl) {
      return [defaultValues.imageUrl];
    }
    return [];
  };

  const getInitialVariants = (): SizeStock[] => {
    if (existingVariants && existingVariants.length > 0) {
      return existingVariants.map(v => ({
        size: v.size,
        stock: v.stock,
        variantId: v.id,
      }));
    }
    return [];
  };

  const [productImages, setProductImages] = useState<string[]>(getInitialImages());
  const [newImageUrl, setNewImageUrl] = useState("");
  const [sizeVariants, setSizeVariants] = useState<SizeStock[]>(getInitialVariants());
  const [newSize, setNewSize] = useState("");
  const [newStock, setNewStock] = useState("");
  
  const form = useForm<InsertProduct>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      brand: defaultValues?.brand || "",
      size: defaultValues?.size || "",
      color: defaultValues?.color || "",
      price: defaultValues?.price || 0,
      stock: defaultValues?.stock || 0,
      category: defaultValues?.category || "",
      imageUrl: defaultValues?.imageUrl || null,
      imageUrls: defaultValues?.imageUrls || null,
    },
  });

  useEffect(() => {
    if (sizeVariants.length > 0) {
      const totalStock = sizeVariants.reduce((sum, v) => sum + v.stock, 0);
      form.setValue("stock", totalStock);
      form.setValue("size", sizeVariants[0].size);
    }
  }, [sizeVariants, form]);

  const updateFormImages = (images: string[]) => {
    form.setValue("imageUrl", images[0] || null);
    form.setValue("imageUrls", images.length > 0 ? JSON.stringify(images) : null);
  };

  const addImageUrl = () => {
    if (!newImageUrl.trim()) return;
    if (productImages.length >= 5) return;
    if (productImages.includes(newImageUrl.trim())) return;
    const newImages = [...productImages, newImageUrl.trim()];
    setProductImages(newImages);
    updateFormImages(newImages);
    setNewImageUrl("");
  };

  const removeImage = (index: number) => {
    const newImages = productImages.filter((_, i) => i !== index);
    setProductImages(newImages);
    updateFormImages(newImages);
  };

  const addSizeVariant = () => {
    if (!newSize || !newStock) return;
    const stockNum = parseInt(newStock);
    if (isNaN(stockNum) || stockNum < 0) return;
    if (sizeVariants.some(v => v.size === newSize)) {
      return;
    }
    setSizeVariants([...sizeVariants, { size: newSize, stock: stockNum }]);
    setNewSize("");
    setNewStock("");
  };

  const removeSizeVariant = (index: number) => {
    setSizeVariants(sizeVariants.filter((_, i) => i !== index));
  };

  const updateVariantStock = (index: number, stock: number) => {
    const updated = [...sizeVariants];
    updated[index].stock = stock;
    setSizeVariants(updated);
  };

  const handleFormSubmit = (data: InsertProduct) => {
    onSubmit(data, sizeVariants);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Air Max 90" {...field} data-testid="input-product-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder="Nike" {...field} data-testid="input-product-brand" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-product-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-product-color">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COLORS.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="99.99"
                    {...field}
                    data-testid="input-product-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="col-span-2 space-y-3">
            <FormLabel>Size Variants</FormLabel>
            {sizeVariants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sizeVariants.map((variant, index) => (
                  <div key={index} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                    <span className="text-sm font-medium">Size {variant.size}:</span>
                    <Input
                      type="number"
                      min="0"
                      value={variant.stock}
                      onChange={(e) => updateVariantStock(index, parseInt(e.target.value) || 0)}
                      className="w-16 h-7 text-sm"
                      data-testid={`input-variant-stock-${index}`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeSizeVariant(index)}
                      data-testid={`button-remove-variant-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Select value={newSize} onValueChange={setNewSize}>
                <SelectTrigger className="w-24" data-testid="select-new-size">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.filter(s => !sizeVariants.some(v => v.size === s)).map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                placeholder="Qty"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-20"
                data-testid="input-new-stock"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSizeVariant}
                disabled={!newSize || !newStock}
                data-testid="button-add-size"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add multiple sizes with their stock quantities
            </p>
          </div>


          {sizeVariants.length > 0 && (
            <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Total Stock:</span>
              <span className="font-medium text-foreground">
                {sizeVariants.reduce((sum, v) => sum + v.stock, 0)}
              </span>
            </div>
          )}

          <FormItem className="col-span-2">
            <FormLabel>Product Images ({productImages.length}/5)</FormLabel>
            <div className="space-y-3">
              {productImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {productImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img}
                        alt={`Product ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => removeImage(index)}
                        data-testid={`button-remove-image-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {index === 0 && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                          Main
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {productImages.length < 5 && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter image URL..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1"
                      data-testid="input-image-url"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addImageUrl}
                      disabled={!newImageUrl.trim()}
                      data-testid="button-add-image-url"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add up to 5 image URLs
                  </p>
                </div>
              )}
            </div>
          </FormItem>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isLoading} data-testid="button-submit-product">
            {isLoading ? "Saving..." : defaultValues ? "Update Product" : "Add Product"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
