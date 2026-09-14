export function getDeliveryMode(config) {
  return config.delivery?.mode || "both";
}

const CHANNEL_META = {
  whatsapp: { label: "WhatsApp", icon: "whatsapp" },
  telegram: { label: "Telegram", icon: "telegram" },
  email: { label: "Email", icon: "email" },
};

function getChannelConfig(config) {
  return config.messaging || { defaultChannel: "whatsapp", channels: {} };
}

function getChannelSettings(config, channelId) {
  const msg = getChannelConfig(config);
  const legacy = config.whatsappNumber || "+15551234567";
  const settings = msg.channels?.[channelId] || {};
  if (channelId === "whatsapp" && !settings.number) settings.number = legacy;
  return settings;
}

export function getEnabledChannels(config) {
  const msg = getChannelConfig(config);
  const channels = msg.channels || {};
  const enabled = Object.entries(channels)
    .filter(([, v]) => v.enabled !== false)
    .map(([id]) => ({ id, ...CHANNEL_META[id] }))
    .filter((c) => c.id);
  if (enabled.length === 0) return [{ id: "whatsapp", ...CHANNEL_META.whatsapp }];
  return enabled;
}

export function getDefaultChannel(config) {
  const msg = getChannelConfig(config);
  const enabled = getEnabledChannels(config);
  if (msg.defaultChannel && enabled.some((c) => c.id === msg.defaultChannel)) {
    return msg.defaultChannel;
  }
  return enabled[0]?.id || "whatsapp";
}

export function getChannelUrl(channelId, config, message) {
  const s = getChannelSettings(config, channelId);
  const name = config.name || "Store";

  switch (channelId) {
    case "whatsapp": {
      const num = s.number.replace(/[^0-9+]/g, "");
      return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
    }
    case "telegram": {
      return `https://t.me/${s.username}?text=${encodeURIComponent(message)}`;
    }
    case "email": {
      const subject = encodeURIComponent(`Pedido desde ${name}`);
      return `mailto:${s.address}?subject=${subject}&body=${encodeURIComponent(message)}`;
    }
    default:
      return "";
  }
}

export function buildOrderMessage(orderData, storeConfig) {
  const { customer, cartItems, totalUSD } = orderData;
  let message = `*Nuevo pedido - ${storeConfig.name}*\n`;
  message += `──────────────────────────\n\n`;
  if (customer.name) message += `*Cliente:* ${customer.name}\n`;
  if (customer.phone) message += `*Teléfono:* ${customer.phone}\n`;
  if (customer.delivery === "delivery") {
    message += `*Entrega:* A domicilio\n`;
    if (customer.address) message += `   *Dirección:* ${customer.address}\n`;
  } else if (customer.delivery === "pickup") {
    message += `*Recogida:* En tienda\n`;
    message += `   *Dirección:* ${storeConfig.location}\n`;
  }
  if (customer.payment) {
    message += `*Pago:* ${customer.payment}${customer.paymentOther ? ` (${customer.paymentOther})` : ""}\n`;
  }
  message += `\n──────────────────────────\n`;
  message += `*Productos:*\n`;
  cartItems.forEach((item) => {
    const itemUSD = (item.priceUSD * item.quantity).toFixed(2);
    message += `*${item.quantity}x* ${item.name}\n`;
    if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
      const optStr = Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(" | ");
      message += `  _${optStr}_\n`;
    } else if (item.attributes && Object.keys(item.attributes).length > 0) {
      const attrStr = Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(" | ");
      message += `  _${attrStr}_\n`;
    }
    message += `  $${item.priceUSD.toFixed(2)} -> *$${itemUSD}*\n\n`;
  });
  message += `──────────────────────────\n`;
  message += `*Total:* $${totalUSD.toFixed(2)}\n\n`;
  message += `¡Gracias! Te confirmaremos pronto.`;
  return message;
}
