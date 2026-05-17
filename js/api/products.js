// api/products.js
export const API_BASE_URL = "https://vintage808-api-six.vercel.app//api" ||'http://localhost:5000/api';
export const IMAGE_BASE_URL = "https://vintage808-api-six.vercel.app/";

export async function getAllProducts() {
  const res = await fetch(`${API_BASE_URL}/products`);
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
  return res.json();
}