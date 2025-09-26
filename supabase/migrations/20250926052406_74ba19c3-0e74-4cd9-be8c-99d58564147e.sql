-- Atualizar o registro existente que foi salvo com BRL incorretamente
UPDATE channel_revenue 
SET currency = 'USD' 
WHERE store_id = 'eebbf8b8-0cde-4dc4-9fe9-fc9870af9075'
  AND currency = 'BRL';