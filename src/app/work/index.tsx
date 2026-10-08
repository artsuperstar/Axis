import { FinanceScreen } from '@/features/finance/finance-screen';

// Direct subroute entry has no prior Finance screen to pop to.
export default function WorkScreen() { return <FinanceScreen initialView="work" />; }
