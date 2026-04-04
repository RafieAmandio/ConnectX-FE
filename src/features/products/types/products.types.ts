export type ProductDimensions = {
  depth: number;
  height: number;
  width: number;
};

export type ProductReview = {
  comment: string;
  date: string;
  rating: number;
  reviewerEmail: string;
  reviewerName: string;
};

export type ProductItem = {
  availabilityStatus: string;
  brand?: string;
  category: string;
  description: string;
  dimensions: ProductDimensions;
  discountPercentage: number;
  id: number;
  images: string[];
  minimumOrderQuantity: number;
  price: number;
  rating: number;
  reviews: ProductReview[];
  shippingInformation: string;
  sku: string;
  stock: number;
  tags: string[];
  thumbnail: string;
  title: string;
};

export type ProductsResponse = {
  limit: number;
  products: ProductItem[];
  skip: number;
  total: number;
};
