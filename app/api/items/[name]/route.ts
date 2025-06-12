import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET(request: Request, { params }: { params: { name: string } }) {
  const item = await prisma.item.findUnique({
    where: { name: decodeURIComponent(params.name) },
    include: { states: true },
  });
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  return NextResponse.json(item);
} 