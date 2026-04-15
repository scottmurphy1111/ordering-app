import { relations } from 'drizzle-orm';
import { tenant, tenantUsers } from './tenant';
import { menuCategories, menuItems, modifiers, modifierOptions, menuItemModifiers } from './menu';
import { orders, orderItems } from './orders';
import { user, session, account } from './auth.schema';

export const tenantRelations = relations(tenant, ({ many }) => ({
	users: many(tenantUsers),
	categories: many(menuCategories),
	items: many(menuItems),
	orders: many(orders),
	modifiers: many(modifiers)
}));

export const tenantUsersRelations = relations(tenantUsers, ({ one }) => ({
	tenant: one(tenant, { fields: [tenantUsers.tenantId], references: [tenant.id] }),
	user: one(user, { fields: [tenantUsers.userId], references: [user.id] })
}));

export const userRelations = relations(user, ({ many }) => ({
	tenants: many(tenantUsers),
	sessions: many(session),
	accounts: many(account)
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
	tenant: one(tenant, { fields: [menuCategories.tenantId], references: [tenant.id] }),
	items: many(menuItems)
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
	tenant: one(tenant, { fields: [menuItems.tenantId], references: [tenant.id] }),
	category: one(menuCategories, { fields: [menuItems.categoryId], references: [menuCategories.id] }),
	modifiers: many(menuItemModifiers)
}));

export const modifiersRelations = relations(modifiers, ({ one, many }) => ({
	tenant: one(tenant, { fields: [modifiers.tenantId], references: [tenant.id] }),
	items: many(menuItemModifiers),
	options: many(modifierOptions)
}));

export const modifierOptionsRelations = relations(modifierOptions, ({ one }) => ({
	modifier: one(modifiers, { fields: [modifierOptions.modifierId], references: [modifiers.id] })
}));

export const menuItemModifiersRelations = relations(menuItemModifiers, ({ one }) => ({
	menuItem: one(menuItems, { fields: [menuItemModifiers.menuItemId], references: [menuItems.id] }),
	modifier: one(modifiers, { fields: [menuItemModifiers.modifierId], references: [modifiers.id] })
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
	tenant: one(tenant, { fields: [orders.tenantId], references: [tenant.id] }),
	items: many(orderItems)
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
	order: one(orders, { fields: [orderItems.orderId], references: [orders.id] })
}));
