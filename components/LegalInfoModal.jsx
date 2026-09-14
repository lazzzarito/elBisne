"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
const SECTIONS = [
  {
    id: "cookies",
    title: "Política de Cookies",
    icon: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm1-13h-2v2h2zm0 4h-2v6h2z",
    content: (
      <>
        <p>Este sitio usa solo <strong>cookies esenciales</strong> necesarias para el funcionamiento básico. Incluyen:</p>
        <ul>
          <li><strong>localStorage</strong> — para conservar los productos del carrito (<code>elbisne_cart</code>), contadores de vendidos (<code>elbisne_sold</code>), información del cliente (<code>elbisne_customer</code>) y favoritos (<code>elbisne_favorites</code>). Todos los datos permanecen en tu navegador y nunca se envían a ningún servidor.</li>
          <li><strong>Estado de sesión</strong> — gestión de estado de React para alternar la interfaz (modales, filtros, búsqueda). No se configuran cookies para este propósito.</li>
        </ul>
        <p>El iframe de Google Maps incrustado puede configurar sus propias cookies al interactuar con el mapa. Aplica la política de cookies de Google de forma independiente. No se usan cookies de publicidad, seguimiento ni analítica de terceros en este sitio.</p>
        <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>Al seguir navegando, consientes el uso de estas cookies esenciales y las funciones de localStorage.</p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Política de Privacidad",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm0-2V6.1l6-2.3v7.2c0 4.5-6 7.6-6 7.6z",
    content: (
      <>
        <p>Nos tomamos tu privacidad muy en serio. Esta es una <strong>página estática</strong> sin servidor backend, sin base de datos y sin cuentas de usuario.</p>
        <ul>
          <li><strong>Sin recopilación de datos</strong> — No recopilamos, almacenamos ni compartimos información personal. No hay formularios que envíen datos a un servidor, ni scripts de analítica, ni píxeles de rastreo.</li>
          <li><strong>Solo almacenamiento local</strong> — El contenido del carrito, los datos del cliente y las preferencias se guardan exclusivamente en el <code>localStorage</code> de tu navegador. Estos datos nunca salen de tu dispositivo, salvo que los envíes explícitamente.</li>
          <li><strong>Mensajería</strong> — Al confirmar un pedido, el mensaje se compone en tu navegador y se abre en el canal seleccionado (WhatsApp, Telegram o Email). El mensaje se envía directamente a través de la plataforma de cada proveedor. No interceptamos, registramos ni almacenamos tus conversaciones.</li>
          <li><strong>Sin cookies propias</strong> — No configuramos cookies de seguimiento ni publicidad. El único almacenamiento del navegador usado es <code>localStorage</code> (solo del lado del cliente).</li>
          <li><strong>Contenidos incrustados de terceros</strong> — El sitio puede mostrar un iframe de Google Maps. Google puede configurar sus propias cookies según su política de privacidad al interactuar con el mapa.</li>
        </ul>
      </>
    ),
  },
  {
    id: "data-usage",
    title: "Uso de datos",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    content: (
      <>
        <p>Los únicos datos personales que puedes proporcionar son los que ingresas en los formularios de pedido:</p>
        <ul>
          <li><strong>Nombre</strong> — para atender tu pedido</li>
          <li><strong>Teléfono</strong> — lo usa la tienda para contactarte sobre tu pedido</li>
          <li><strong>Dirección de entrega</strong> — solo si eliges entrega a domicilio</li>
          <li><strong>Método de pago</strong> — tu preferencia declarada (el pago real se gestiona fuera del sitio)</li>
        </ul>
        <p><strong>Cómo fluye:</strong></p>
        <ol>
          <li>Completa tus datos en el formulario de pedido.</li>
          <li>Los datos se guardan en <code>localStorage</code> de tu dispositivo por comodidad (se rellenan la próxima vez).</li>
          <li>Al confirmar, se compone un mensaje con tus datos y el resumen del pedido vía el canal elegido (WhatsApp, Telegram o Email).</li>
          <li>Se te redirige a la plataforma correspondiente donde puedes revisar y enviar el mensaje.</li>
        </ol>
        <p><strong>Lo que NO hacemos:</strong></p>
        <ul>
          <li>No enviamos datos a ningún servidor ni API.</li>
          <li>No almacenamos tus datos en ninguna base de datos.</li>
          <li>No compartimos tus datos con terceros.</li>
          <li>No usamos tus datos para mercadeo ni analítica.</li>
        </ul>
      </>
    ),
  },
  {
    id: "terms",
    title: "Términos de uso",
    icon: "M16 9H8m8 4H8m4-7a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4m0-16a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4m0-16a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4",
    content: (
      <>
        <p>Al usar este sitio web aceptas los siguientes términos:</p>
        <ul>
          <li><strong>Propósito del sitio</strong> — Este sitio se construyó a partir de <strong>elBisne</strong>, un proyecto open source de catálogos en línea. Los productos mostrados pueden ser ficticios o de demostración.</li>
          <li><strong>Responsabilidad del operador de la tienda</strong> — La persona o negocio que opera esta tienda es responsable de:
            <ul>
              <li>La exactitud de las descripciones, precios y disponibilidad de los productos</li>
              <li>El cumplimiento de pedidos, envíos y atención al cliente</li>
              <li>El cumplimiento de las leyes y regulaciones locales</li>
            </ul>
          </li>
          <li><strong>Sin afiliación</strong> — WhatsApp, Telegram y otras plataformas de mensajería referidas en este sitio son marcas de sus respectivos dueños. Este sitio no tiene afiliación, respaldo ni patrocinio de ninguna de estas plataformas.</li>
          <li><strong>Propiedad intelectual</strong> — Todas las imágenes, nombres y descripciones de productos son responsabilidad del operador de la tienda. El código de elBisne se licencia por separado (ver sección Licencia).</li>
          <li><strong>Disponibilidad</strong> — Nos esforzamos por mantener el sitio operativo, pero no garantizamos acceso ininterrumpido. El sitio puede quedar fuera de línea por mantenimiento o a criterio del operador.</li>
        </ul>
      </>
    ),
  },
  {
    id: "template",
    title: "Acerca de elBisne",
    icon: "M22 12h-4l-3 9L9 3l-3 9H2",
    content: (
      <>
        <p>Este sitio funciona con <strong>elBisne</strong>, un proyecto open source de catálogos de e-commerce pensado para pequeños negocios y emprendedores.</p>
        <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.85rem", color: "var(--text-primary)" }}>Stack técnico</h4>
        <ul>
          <li><strong>Framework:</strong> Next.js 16 (App Router) — generación de sitios estáticos (SSG) con Turbopack</li>
          <li><strong>Lenguaje:</strong> JavaScript (ECMAScript) con JSX</li>
          <li><strong>Estilos:</strong> Tailwind CSS v4 vía variables CSS personalizadas (custom properties), sin archivo de configuración</li>
          <li><strong>Contenido:</strong> Archivos Markdown con frontmatter YAML (<code>content/products/*.md</code>) — sin base de datos</li>
          <li><strong>Estado:</strong> Hooks de React <code>useState</code> + <code>useEffect</code>, solo del lado del cliente</li>
          <li><strong>Persistencia:</strong> <code>localStorage</code> del navegador (carrito, favoritos, datos del cliente, contadores de vendidos)</li>
          <li><strong>Pedidos:</strong> Mensajería multicanal (WhatsApp, Telegram, Email) mediante deep links — sin backend</li>
          <li><strong>Imágenes:</strong> componente Image de Next.js con rutas dinámicas (<code>/api/images/*</code>)</li>
          <li><strong>Despliegue:</strong> Exportación totalmente estática, desplegable en cualquier host estático (Vercel, Netlify, GitHub Pages, etc.)</li>
        </ul>
        <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.85rem", color: "var(--text-primary)" }}>Características clave</h4>
        <ul>
          <li>Rejilla de productos tipo masonry, responsiva y estilo Pinterest</li>
          <li>Modal de detalle de producto con variantes de opciones y galería de imágenes</li>
          <li>Compra rápida y carrito flotante con integración de pedidos multicanal</li>
          <li>Seguimiento de stock e inventario (del lado del cliente)</li>
          <li>Sección de ofertas flash con filtro de descuentos</li>
          <li>Sistema de favoritos / lista de deseos con corazón animado</li>
          <li>Banners promocionales con colecciones de productos enlazadas</li>
          <li>Formulario de datos del cliente</li>
          <li>Botón flotante de volver arriba</li>
          <li>Modo oscuro vía custom properties CSS</li>
        </ul>
        <p style={{ marginTop: "1rem" }}>
          <strong>Versión:</strong> 0.2.0<br />
          <strong>Repositorio:</strong> <a href="https://github.com/lazzzarito/elBisne" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-green)" }}>github.com/lazzzarito/elBisne</a><br />
          <strong>Autor:</strong>{" "}
          <a href="https://1azarito.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-green)" }}>1azarito</a>
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "Aviso legal",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
    content: (
      <>
        <p>Este proyecto se proporciona <strong>&ldquo;tal cual&rdquo;</strong> y <strong>&ldquo;según disponibilidad&rdquo;</strong>, sin garantías de ningún tipo, expresas o implícitas.</p>
        <ul>
          <li>El autor y los colaboradores no son responsables de los daños derivados del uso de este proyecto.</li>
          <li>El operador de la tienda es el único responsable de cumplir todas las leyes, regulaciones y políticas de plataforma aplicables.</li>
          <li>La información de productos, imágenes y precios mostrados en este sitio son responsabilidad del operador de la tienda.</li>
          <li>La entrega de mensajes depende de la infraestructura de cada proveedor (WhatsApp, Telegram o Email) y está sujeta a sus respectivos términos de servicio.</li>
          <li>Los mapas incrustados y los servicios externos están sujetos a los términos y disponibilidad de sus respectivos proveedores.</li>
        </ul>
      </>
    ),
  },
  {
    id: "license",
    title: "Licencia",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    content: (
      <>
        <p>elBisne es software open source bajo la <strong>Licencia MIT</strong>.</p>
        <div style={{ background: "var(--bg-secondary)", padding: "0.75rem 1rem", borderRadius: "10px", fontSize: "0.78rem", lineHeight: 1.6, margin: "0.75rem 0", color: "var(--text-secondary)" }}>
          <p>Licencia MIT</p>
          <p style={{ marginTop: "0.5rem" }}>Copyright &copy; {new Date().getFullYear()} 1azarito</p>
          <p style={{ marginTop: "0.5rem" }}>
            Se otorga permiso por la presente, de forma gratuita, a cualquier persona que obtenga una copia de este software y de los archivos de documentación asociados (el &ldquo;Software&rdquo;), para tratar el Software sin restricciones, incluidos, sin limitación, los derechos de usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y/o vender copias del Software, y de permitir a las personas a quienes se les proporcione el Software hacerlo, sujeto a las siguientes condiciones:
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            El aviso de copyright anterior y este aviso de permiso deben incluirse en todas las copias o partes sustanciales del Software.
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            EL SOFTWARE SE PROPORCIONA &ldquo;TAL CUAL&rdquo;, SIN GARANTÍA DE NINGÚN TIPO, EXPRESA O IMPLÍCITA, INCLUIDAS, ENTRE OTRAS, LAS GARANTÍAS DE COMERCIABILIDAD, IDONEIDAD PARA UN FIN PARTICULAR Y NO INFRACCIÓN. EN NINGÚN CASO LOS AUTORES O TITULARES DE DERECHOS DE AUTOR SERÁN RESPONSABLES DE CUALQUIER RECLAMO, DAÑO U OTRA RESPONSABILIDAD, YA SEA EN UNA ACCIÓN DE CONTRATO, AGRAVIO O DE OTRO TIPO, QUE SURJA DE, O EN RELACIÓN CON EL SOFTWARE O SU USO U OTRAS TRANSACCIONES EN EL SOFTWARE.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Servicios de terceros",
    icon: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z",
    content: (
      <>
        <p>Este sitio se integra con los siguientes servicios de terceros:</p>
        <div className="legal-service">
          <strong>WhatsApp</strong>
          <p>Se usa para enviar mensajes de pedido mediante enlaces <code>wa.me</code>. Tu mensaje se envía a través de la infraestructura de WhatsApp. Consulta los <a href="https://www.whatsapp.com/legal" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-green)" }}>Términos legales de WhatsApp</a>.</p>
        </div>
        <div className="legal-service">
          <strong>Telegram</strong>
          <p>Se usa para enviar mensajes de pedido mediante enlaces <code>t.me</code>. Consulta la <a href="https://telegram.org/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-green)" }}>Política de privacidad de Telegram</a>.</p>
        </div>
        <div className="legal-service">
          <strong>Email</strong>
          <p>Se usa para enviar mensajes de pedido mediante enlaces <code>mailto:</code>. Tu cliente de correo gestiona la entrega según las políticas de tu proveedor de email.</p>
        </div>
        <div className="legal-service">
          <strong>Google Maps</strong>
          <p>Un mapa incrustado muestra la ubicación de la tienda. Google puede configurar cookies al interactuar con el mapa. Consulta la <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-green)" }}>Política de privacidad de Google</a>.</p>
        </div>
        <div className="legal-service">
          <strong>Vercel</strong>
          <p>El sitio puede estar alojado en la plataforma de Vercel. Vercel proporciona la infraestructura pero no tiene acceso a tus datos. Consulta la <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-green)" }}>Política de privacidad de Vercel</a>.</p>
        </div>
        <div className="legal-service">
          <strong>GitHub</strong>
          <p>El código fuente se aloja en GitHub. Consulta la <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-green)" }}>Declaración de privacidad de GitHub</a>.</p>
        </div>
      </>
    ),
  },
];

export default function LegalInfoModal({ storeConfig }) {
  const [visible, setVisible] = useState(false);
  const [openSections, setOpenSections] = useState({});

  const handleClose = useCallback(() => setVisible(false), []);

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("open-legal-modal", handler);
    return () => window.removeEventListener("open-legal-modal", handler);
  }, []);

  useEffect(() => {
    if (visible) {
      const unlock = lockBodyScroll();
      const handler = (e) => { if (e.key === "Escape") handleClose(); };
      document.addEventListener("keydown", handler);
      return () => {
        document.removeEventListener("keydown", handler);
        unlock();
      };
    }
  }, [visible, handleClose]);

  useHistoryPopup(visible, handleClose);

  if (!visible) return null;

  return (
    <div className="store-info-overlay" onClick={handleClose}>
      <div className="store-info-modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "80dvh" }}>
        <button className="modal-close" onClick={handleClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="store-info-scroll">
          <div className="store-info-header">
            {storeConfig.logoUrl && (
              <Image src={storeConfig.logoUrl} alt={storeConfig.name} width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <h2 className="store-info-title">Información legal</h2>
              <span className="store-info-badge">Cookies, Privacidad y Términos</span>
            </div>
          </div>

          <div className="store-info-body">
            {SECTIONS.map((section) => {
              const isOpen = !!openSections[section.id];
              return (
                <div key={section.id} className="legal-section">
                  <button
                    className={`legal-section-header${isOpen ? " open" : ""}`}
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isOpen}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "0.5rem", flexShrink: 0 }}>
                      <path d={section.icon} />
                    </svg>
                    <span>{section.title}</span>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="legal-chevron"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <div className={`legal-section-body${isOpen ? " open" : ""}`}>
                    <div className="legal-section-content">
                      {section.content}
                    </div>
                  </div>
                </div>
              );
            })}

            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center", marginTop: "1.5rem" }}>
              Última actualización: junio 2026
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .legal-section {
          border-bottom: 1px solid var(--border-color);
        }

        .legal-section:last-child {
          border-bottom: none;
        }

        .legal-section-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.85rem 0;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: color 0.2s;
        }

        .legal-section-header:hover {
          color: var(--accent-green);
        }

        .legal-section-header span {
          flex: 1;
        }

        .legal-chevron {
          transition: transform 0.25s ease;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .legal-section-header.open .legal-chevron {
          transform: rotate(90deg);
        }

        .legal-section-body {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.3s ease;
        }

        .legal-section-body.open {
          grid-template-rows: 1fr;
        }

        .legal-section-content {
          overflow: hidden;
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .legal-section-content p {
          margin-bottom: 0.5rem;
        }

        .legal-section-content ul,
        .legal-section-content ol {
          padding-left: 1.25rem;
          margin: 0.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .legal-section-content li {
          list-style-type: disc;
        }

        .legal-section-content ol li {
          list-style-type: decimal;
        }

        .legal-section-content ul ul {
          margin: 0.25rem 0 0.25rem 0.5rem;
        }

        .legal-section-content ul ul li {
          list-style-type: circle;
        }

        .legal-section-content strong {
          color: var(--text-primary);
        }

        .legal-section-content code {
          background: var(--bg-secondary);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          font-size: 0.78rem;
        }

        .legal-section-content a:hover {
          text-decoration: underline;
        }

        .legal-service {
          margin: 0.75rem 0;
        }

        .legal-service strong {
          display: block;
          margin-bottom: 0.15rem;
        }

        .legal-service p {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
