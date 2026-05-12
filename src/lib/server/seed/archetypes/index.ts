import type { ArchetypeFixture, FulfillmentModelValue } from '../types';
import { hybridBakeryWithMarket } from './hybrid-bakery-with-market';
import { csaWeekly } from './csa-weekly';
import { farmersMarketBooth } from './farmers-market-booth';

export const ARCHETYPES: Record<string, ArchetypeFixture> = {
	'hybrid-bakery-with-market': hybridBakeryWithMarket,
	'csa-weekly': csaWeekly,
	'farmers-market-booth': farmersMarketBooth
};

export function getArchetypeFixture(key: string): ArchetypeFixture | undefined {
	return ARCHETYPES[key];
}

export function archetypesForFulfillmentModel(
	model: FulfillmentModelValue
): ArchetypeFixture[] {
	return Object.values(ARCHETYPES).filter((a) => a.allowedFulfillmentModels.includes(model));
}
