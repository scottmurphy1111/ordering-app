import { relations } from 'drizzle-orm';
import {
	tenant,
	tenantUsers,
	menuCategories,
	menuItems,
	modifiers,
	menuItemModifiers,
	orders,
	orderItems
} from './schema'; // import all

// Example relations (expand as needed)
export const tenantRelations = relations(tenant, ({ many }) => ({
	users: many(tenantUsers),
	categories: many(menuCategories),
	items: many(menuItems),
	orders: many(orders),
	modifiers: many(modifiers)
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
	restaurant: one(tenant, { fields: [menuItems.tenantId], references: [tenant.id] }),
	category: one(menuCategories, {
		fields: [menuItems.categoryId],
		references: [menuCategories.id]
	}),
	modifiers: many(menuItemModifiers)
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
	restaurant: one(tenant, { fields: [orders.tenantId], references: [tenant.id] }),
	items: many(orderItems)
}));

// Add more for modifiers, users, etc.
