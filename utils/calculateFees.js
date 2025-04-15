const calculateFees = (subtotal, settings, discount = 0) => {
    const defaults = {
      taxRate: { value: 0 },
      deliveryFee: { type: 'flat', value: 0 },
      freeDeliveryThreshold: { type: 'flat', value: 0 },
      surCharge: { type: 'flat', value: 0 },
    };
  
    const taxRate = settings.taxRate || defaults.taxRate;
    const deliveryFee = settings.deliveryFee || defaults.deliveryFee;
    const freeDeliveryThreshold = settings.freeDeliveryThreshold || defaults.freeDeliveryThreshold;
    const surCharge = settings.surCharge || defaults.surCharge;
  
    const tax = subtotal * (taxRate.value || 0);
    const thresholdValue = freeDeliveryThreshold.type === 'percentage'
      ? (subtotal * (freeDeliveryThreshold.value || 0)) / 100
      : (freeDeliveryThreshold.value || 0);
    const shipping = subtotal > thresholdValue
      ? 0
      : deliveryFee.type === 'percentage'
        ? (subtotal * (deliveryFee.value || 0)) / 100
        : (deliveryFee.value || 0);
    const surchargeValue = surCharge.type === 'percentage'
      ? (subtotal * (surCharge.value || 0)) / 100
      : (surCharge.value || 0);
    const total = subtotal + shipping + tax + surchargeValue - (discount || 0);
  
    return {
      subtotal,
      shipping,
      tax,
      surCharge: surchargeValue,
      total,
    };
  };
  
  module.exports = { calculateFees };