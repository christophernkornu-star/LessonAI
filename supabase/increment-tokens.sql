-- Helper for token stats
create or replace function increment_token_usage(p_user_id uuid, p_tokens int) 
returns void 
language sql 
security definer
as $$
  update user_payment_profiles 
  set total_tokens_used = coalesce(total_tokens_used, 0) + p_tokens 
  where user_id = p_user_id;
$$;