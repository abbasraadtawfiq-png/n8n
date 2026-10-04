import { getContactDeps } from '@/lib/contact/config';
import { handleContact } from '@/lib/contact/handler';

export async function POST(request: Request) {
	return handleContact(request, getContactDeps());
}

export function GET() {
	return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
