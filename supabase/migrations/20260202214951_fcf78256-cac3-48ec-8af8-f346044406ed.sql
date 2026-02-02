-- Clear style_prompt to force regeneration with correct sertanejo style
UPDATE orders 
SET style_prompt = NULL, final_prompt = NULL
WHERE id = 'b925aa1f-2536-451a-8b07-6334ff39acbe';