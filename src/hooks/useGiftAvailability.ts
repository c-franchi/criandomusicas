import { createContext, useContext } from "react";

// Default is closed, including isolated previews and unavailable configuration.
export const GiftAvailabilityContext = createContext({
  physicalEnabled: false,
  loading: false,
});
export const useGiftAvailability = () => useContext(GiftAvailabilityContext);
