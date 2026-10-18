import AdminPageHeader from '../components/AdminPageHeader';
import InquiriesManager from './InquiriesManager';

export default function InquiriesPage() {
  return <><AdminPageHeader title="Inquiries" description="Review customer requests for parts that are not listed in the Shop." /><InquiriesManager /></>;
}
