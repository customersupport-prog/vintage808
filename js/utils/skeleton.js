// js/utils/skeleton.js
// Renders N skeleton product cards into a grid element

export function showSkeletons(grid, count = 6) {
  if (!grid) return;
  grid.innerHTML = Array.from({ length: count }, () => `
    <div class="product-card-skeleton">
      <div class="skeleton skeleton-image"></div>
      <div class="skeleton skeleton-name"></div>
      <div class="skeleton skeleton-price"></div>
      <div class="skeleton skeleton-btn"></div>
    </div>
  `).join('');
}