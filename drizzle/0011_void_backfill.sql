UPDATE "orders" SET "payment_status" = 'void' WHERE "status" = 'cancelled' AND "payment_status" = 'pending';
