INSERT INTO `fiscal_config` (`id`, `companyName`, `companyTaxId`, `controlNumber`, `updatedAt`)
VALUES ('default', 'Tu Empresa C.A.', 'J-000000000', 1, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
    `companyName` = 'Tu Empresa C.A.',
    `companyTaxId` = 'J-000000000';