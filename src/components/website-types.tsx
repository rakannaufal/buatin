import {
  AppWindow,
  Building2,
  CalendarDays,
  Images,
  LayoutTemplate,
  Newspaper,
  PanelsTopLeft,
  Shapes,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { webTypes } from "@/domain/catalog";
import type { WebType } from "@/domain/types";

const icons = {
  landing: LayoutTemplate,
  company: Building2,
  portfolio: Images,
  blog: Newspaper,
  ecommerce: ShoppingBag,
  saas: AppWindow,
  internal: PanelsTopLeft,
  booking: CalendarDays,
  custom: Shapes,
} satisfies Record<WebType, LucideIcon>;

export function WebsiteTypes() {
  return (
    <section
      className="website-types public-container"
      aria-labelledby="types-heading"
    >
      <h2 id="types-heading">Apa pun ide websitenya.</h2>
      <ul className="website-type-grid">
        {webTypes.map((type) => {
          const Icon = icons[type.id];
          return (
            <li className="website-type-card" data-type={type.id} key={type.id}>
              <span className="website-type-icon" aria-hidden="true">
                <Icon size={30} strokeWidth={1.6} />
              </span>
              <div>
                <h3>{type.label}</h3>
                <p>{type.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
