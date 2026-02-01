-- Atomic Deduction Function to prevent race conditions
create or replace function deduct_account_balance(
  p_user_id uuid,
  p_amount numeric
)
returns json
language plpgsql
security definer
as $$
declare
  current_bal numeric;
  new_bal numeric;
begin
  -- Lock the row for update to prevent concurrent reads
  select wallet_balance into current_bal
  from user_payment_profiles
  where user_id = p_user_id
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'Payment profile not found');
  end if;

  if current_bal < p_amount then
    return json_build_object(
      'success', false, 
      'error', 'Insufficient balance',
      'current_balance', current_bal
    );
  end if;

  new_bal := current_bal - p_amount;

  -- Update balance and stats
  update user_payment_profiles
  set 
    wallet_balance = new_bal,
    total_spent = total_spent + p_amount
  where user_id = p_user_id;

  return json_build_object(
    'success', true, 
    'new_balance', new_bal
  );
end;
$$;