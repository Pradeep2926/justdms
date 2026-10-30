import api from "../api/api";
import { createSubscriptionCheckout } from "./subscriptionCheckout.mjs";
let gatewayRequest;
function loadGateway() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!gatewayRequest) {
    gatewayRequest = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Checkout is unavailable."));
      script.onerror = () => { script.remove(); reject(new Error("Payment checkout could not be loaded. Please try again.")); };
      document.body.appendChild(script);
    }).catch(error => { gatewayRequest = null; throw error; });
  }
  return gatewayRequest;
}
export const openSubscriptionCheckout = createSubscriptionCheckout({ api, loadGateway });
