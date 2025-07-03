declare module "react-native-razorpay" {
  interface RazorpayOptions {
    description: string;
    image?: string;
    currency: string;
    key: string;
    amount: string | number;
    name: string;
    order_id: string;
    prefill: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
  }

  const RazorpayCheckout: {
    open: (options: RazorpayOptions) => Promise<any>;
  };

  export default RazorpayCheckout;
}
