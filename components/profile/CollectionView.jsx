"use client";

import { useState } from "react";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { useFocusTrap } from "@/lib/use-focus-trap";
import Icon from "@/components/Icon";
import EmptyState from "@/components/ui/EmptyState";

// ── Vista de una colección/combo: detalle + slider de productos + añadir ──
export default function CollectionView({
  collection,
  onClose,
  onOpenProduct,
  onEditCollections,
  isOwner = false,
}) {
  const { addToCart, showToast } = useApp();
  const [qty, setQty] = useState(1);

  useFocusTrap(Boolean(collection));
  useHistoryPopup(Boolean(collection), onClose);

  if (!collection) return null;

  const items = collection.products || [];
  const price = Number(collection.price) || 0;

  const handleAdd = () => {
    if (items.length === 0) return;
    const item = {
      id: `collection-${collection.id}`,
      collectionId: collection.id,
      isCollection: true,
      bisneId: collection.bisneId,
      name: collection.title,
      priceUSD: price,
      originalPrice: null,
      category: "Colección",
      image: collection.imageUrl || items[0]?.image || "/images/placeholder.svg",
      stock: Infinity,
      options: {},
      featured: false,
      offer: false,
      status: "available",
      description: collection.bio || "",
    };
    addToCart(item, null, qty);
    showToast(`${collection.title} añadido al carrito`);
  };

  return (
    <div className="collection-view-overlay" onClick={onClose}>
      <div className="collection-view" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={collection.title}>
        <div className="collection-view-header">
          <span className="collection-view-label">Colección</span>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="collection-view-scroll">
          <div className="collection-view-cover">
            {(() => {
              const realImage =
                collection.imageUrl ||
                items.map((p) => p.image).find((img) => img && img !== "/images/placeholder.svg");
              return realImage ? (
                <Image
                  src={realImage}
                  alt={collection.title}
                  fill
                  className="collection-view-cover-img"
                  sizes="100vw"
                />
              ) : (
                <span className="collection-view-cover-ph"><Icon name="layers" size={36} /></span>
              );
            })()}
            {price > 0 && <span className="collection-view-price">{`$${price.toFixed(2)}`}</span>}
          </div>

          <div className="collection-view-body">
            <h2 className="collection-view-title">{collection.title}</h2>
            {collection.bio && <p className="collection-view-bio">{collection.bio}</p>}

            <h3 className="collection-view-subtitle">
              Incluye · {items.length} producto{items.length === 1 ? "" : "s"}
            </h3>

            {items.length > 0 && (
              <div className="collection-view-track">
                {items.map((p) => (
                  <button key={p.id} type="button" className="collection-view-item" onClick={() => onOpenProduct?.(p)} aria-label={p.name}>
                    <Image src={p.image} alt={p.name} width={150} height={150} className="collection-view-item-img" />
                    <span className="collection-view-item-name">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="collection-view-footer">
          {items.length > 0 ? (
            <>
              <div className="collection-view-qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">
                  <Icon name="minus" size={14} />
                </button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Más">
                  <Icon name="plus" size={14} />
                </button>
              </div>
              <button type="button" className="collection-view-add" onClick={handleAdd}>
                Añadir al combo {price > 0 && `· $${(price * qty).toFixed(2)}`}
              </button>
            </>
          ) : (
            <EmptyState compact icon="layers" title="Combo sin productos" description="Añade productos a esta colección desde la edición." />
          )}
          {isOwner && (
            <button type="button" className="collection-view-edit" onClick={onEditCollections}>
              <Icon name="edit" size={13} /> Editar colección
            </button>
          )}
        </div>
      </div>
    </div>
  );
}