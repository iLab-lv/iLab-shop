export async function createOrderWithProfileDefaults(input, session, { createOrder, saveProfileDefaults }) {
  const order = await createOrder(input, session);
  if (input.saveToProfile !== true) return { order, profileSaved: null };

  try {
    await saveProfileDefaults(session.token.uid, order.customer);
    return { order, profileSaved: true };
  } catch (profileSaveError) {
    return { order, profileSaved: false, profileSaveError };
  }
}
