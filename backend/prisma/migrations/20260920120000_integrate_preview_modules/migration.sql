ALTER TABLE `users` MODIFY `role` ENUM('ADMIN', 'COMPRAS', 'VENDEDOR') NOT NULL DEFAULT 'VENDEDOR';

ALTER TABLE `sales` ADD COLUMN `documentType` ENUM('FACTURA', 'NOTA_ENTREGA') NOT NULL DEFAULT 'FACTURA';

CREATE TABLE `price_approvals` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `catalogPrice` DECIMAL(12,4) NOT NULL,
    `chargedPrice` DECIMAL(12,4) NOT NULL,
    `status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    `decidedById` VARCHAR(191) NULL,
    `decidedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `price_approvals_status_idx` (`status`),
    CONSTRAINT `price_approvals_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `price_approvals_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `price_approvals_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `suppliers` (
    `id` VARCHAR(191) NOT NULL,
    `taxId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `suppliers_taxId_key` (`taxId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `purchases` (
    `id` VARCHAR(191) NOT NULL,
    `number` INTEGER NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalUsd` DECIMAL(12,4) NOT NULL,
    `status` ENUM('RECIBIDA','ANULADA') NOT NULL DEFAULT 'RECIBIDA',
    `reference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `purchases_number_key` (`number`),
    PRIMARY KEY (`id`),
    CONSTRAINT `purchases_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `purchases_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `purchase_items` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12,4) NOT NULL,
    `unitCostUsd` DECIMAL(12,4) NOT NULL,
    `subtotalUsd` DECIMAL(12,4) NOT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `purchase_items_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `purchase_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `repack_rules` (
    `id` VARCHAR(191) NOT NULL,
    `parentProductId` VARCHAR(191) NOT NULL,
    `childProductId` VARCHAR(191) NOT NULL,
    `childQuantity` DECIMAL(12,4) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `repack_rules_parentProductId_childProductId_key` (`parentProductId`,`childProductId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `repack_rules_parentProductId_fkey` FOREIGN KEY (`parentProductId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `repack_rules_childProductId_fkey` FOREIGN KEY (`childProductId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `repack_executions` (
    `id` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12,4) NOT NULL,
    `executedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    CONSTRAINT `repack_executions_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `repack_rules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `repack_executions_executedById_fkey` FOREIGN KEY (`executedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `stock_movements` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12,4) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `stock_movements_productId_createdAt_idx` (`productId`,`createdAt`),
    CONSTRAINT `stock_movements_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `warehouses` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `warehouses_code_key` (`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `warehouse_stocks` (
    `id` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12,4) NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `warehouse_stocks_warehouseId_productId_key` (`warehouseId`,`productId`),
    CONSTRAINT `warehouse_stocks_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `warehouse_stocks_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fiscal_config` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `controlNumber` INTEGER NOT NULL DEFAULT 1,
    `authorization` VARCHAR(191) NULL,
    `rangeFrom` INTEGER NULL,
    `rangeTo` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;