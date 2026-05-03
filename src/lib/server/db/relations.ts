import { relations } from 'drizzle-orm';
import { vendor, vendorUsers } from './vendor';
import {
	catalogCategories,
	catalogItems,
	modifiers,
	modifierOptions,
	catalogItemModifiers
} from './catalog';
import { orders, orderItems } from './orders';
import { user, session, account } from './auth.schema';
import { pickupLocations, pickupWindowTemplates, pickupWindows } from './pickup';

export const vendorRelations = relations(vendor, ({ many }) => ({
	users: many(vendorUsers),
	categories: many(catalogCategories),
	items: many(catalogItems),
	orders: many(orders),
	modifiers: many(modifiers),
	pickupLocations: many(pickupLocations),
	pickupWindowTemplates: many(pickupWindowTemplates),
	pickupWindows: many(pickupWindows)
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
	catalogItem: one(catalogItems, {
		fields: [catalogItemModifiers.catalogItemId],
		references: [catalogItems.id]
	}),
	modifier: one(modifiers, {
		fields: [catalogItemModifiers.modifierId],
		references: [modifiers.id]
	})
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
	vendor: one(vendor, { fields: [orders.vendorId], references: [vendor.id] }),
	items: many(orderItems),
	pickupWindow: one(pickupWindows, {
		fields: [orders.pickupWindowId],
		references: [pickupWindows.id]
	}),
	pickupLocation: one(pickupLocations, {
		fields: [orders.pickupLocationId],
		references: [pickupLocations.id]
	})
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
	order: one(orders, { fields: [orderItems.orderId], references: [orders.id] })
}));

export const pickupLocationsRelations = relations(pickupLocations, ({ one, many }) => ({
	vendor: one(vendor, { fields: [pickupLocations.vendorId], references: [vendor.id] }),
	windowTemplates: many(pickupWindowTemplates),
	windows: many(pickupWindows)
}));

export const pickupWindowTemplatesRelations = relations(pickupWindowTemplates, ({ one, many }) => ({
	vendor: one(vendor, { fields: [pickupWindowTemplates.vendorId], references: [vendor.id] }),
	location: one(pickupLocations, {
		fields: [pickupWindowTemplates.locationId],
		references: [pickupLocations.id]
	}),
	windows: many(pickupWindows)
}));

export const pickupWindowsRelations = relations(pickupWindows, ({ one, many }) => ({
	vendor: one(vendor, { fields: [pickupWindows.vendorId], references: [vendor.id] }),
	template: one(pickupWindowTemplates, {
		fields: [pickupWindows.templateId],
		references: [pickupWindowTemplates.id]
	}),
	location: one(pickupLocations, {
		fields: [pickupWindows.locationId],
		references: [pickupLocations.id]
	}),
	orders: many(orders)
}));
