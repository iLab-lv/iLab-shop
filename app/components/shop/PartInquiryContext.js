'use client';

import { createContext, useContext } from 'react';

const PartInquiryContext = createContext(null);

export function usePartInquiry() {
  return useContext(PartInquiryContext);
}

export default PartInquiryContext;
