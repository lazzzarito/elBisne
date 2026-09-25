"use client";

import ProductForm from "@/components/panel/ProductForm";

// Modal de publicación/edición de producto desde el perfil de la tienda.
// Reutiliza el mismo formulario del panel (single source of truth).
export default function PublishProductModal({ bisneId, product = null, categories = [], collections = [], isPersonal = false, onSaved, onDeleted, onClose }) {
  return (
    <ProductForm
      bisneId={bisneId}
      product={product}
      categories={categories}
      collections={collections}
      isPersonal={isPersonal}
      onSaved={(id) => {
        onSaved?.(id, product);
        onClose?.();
      }}
      onDeleted={(id) => {
        onDeleted?.(id, product);
        onClose?.();
      }}
      onCancel={onClose}
    />
  );
}