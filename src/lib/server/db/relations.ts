import { relations } from 'drizzle-orm';
import { vendor, vendorUsers } from './vendor';
import { catalogCategories, catalogItems, modifiers, modifierOptions, catalogItemModifiers } from './catalog';
import { orders, orderItems } from './orders';
import { user, session, account } from './auth.schema';

export const vendorRelations = relations(vendor, ({ many }) => ({
	users: many(vendorUsers),
	categories: many(catalogCategories),
	items: many(catalogItems),
	orders: many(orders),
	modifiers: many(modifiers)
}));

export const vendorUsersRelations = relations(vendorUsers, ({ one }) => ({
	vendor: one(vendor, { fields: [vendorUsers.vendorId], references: [vendor.id] }),
	user: one(user, { fields: [vendorUsers.userId], references: [user.id] })
}));

export const userRelations = relations(user, ({ many }) => ({
	vendors: many(vendorUsers),
	sessions: many(session),
	accounts: many(account)
}));

export const catalogCategoriesRelations = relations(catalogCategories, ({ one, many }) => ({
	vendor: one(vendor, { fields: [catalogCategories.vendorId], references: [vendor.id] }),
	items: many(catalogItems)
}));

export const catalogItemsRelations = relations(catalogItems, ({ one, many }) => ({
	vendor: one(vendor, { fields: [catalogItems.vendorId], references: [vendor.id] }),
	category: one(catalogCategories, {
		fields: [catalogItems.categoryId],
		references: [catalogCategories.id]
	}),
	modifiers: many(catalogItemModifiers)
}));

export const modifiersRelations = relations(modifiers, ({ one, many }) => ({
	vendor: one(vendor, { fields: [modifiers.vendorId], references: [vendor.id] }),
	items: many(catalogItemModifiers),
	options: many(modifierOptions)
}));

export const modifierOptionsRelations = relations(modifierOptions, ({ one }) => ({
	modifier: one(modifiers, { fields: [modifierOptions.modifierId], references: [modifiers.id] })
}));

export const catalogItemModifiersRelations = relations(catalogItemModifiers, ({ one }) => ({
	catalogItem: one(catalogItems, { fields: [catalogItemModifiers.catalogItemId], references: [catalogItems.id] }),
	modifier: one(modifiers, { fields: [catalogItemModifiers.modifierId], references: [modifiers.id] })
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
	vendor: one(vendor, { fields: [orders.vendorId], references: [vendor.id] }),
	items: many(orderItems)
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
	order: one(orders, { fields: [orderItems.orderId], references: [orders.id] })
}));
