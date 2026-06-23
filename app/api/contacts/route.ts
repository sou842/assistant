import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Contact from '@/lib/models/Contact';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const contacts = await Contact.find({ userId: session.user.id }).sort({ name: 1 });
    return NextResponse.json({ contacts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, phone, email } = await req.json();

    if (!name || (!phone && !email)) {
      return NextResponse.json({ error: "Name and at least one contact method (phone or email) are required." }, { status: 400 });
    }

    if (phone && email) {
      return NextResponse.json({ error: "Please save either a phone number OR an email per contact, not both." }, { status: 400 });
    }

    // Basic Validation
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }
    if (phone && !/^\+?\d{10,15}$/.test(phone.replace(/[^0-9+]/g, ''))) {
      return NextResponse.json({ error: "Invalid phone number format." }, { status: 400 });
    }

    await dbConnect();

    // Check if a contact with this phone or email already exists for the user
    const existingQuery: any = { userId: session.user.id };
    if (phone) existingQuery.phone = phone;
    if (email) existingQuery.email = email;

    const existing = await Contact.findOne(existingQuery);

    if (existing) {
      existing.name = name;
      await existing.save();
      return NextResponse.json({ contact: existing });
    }

    const newContact = await Contact.create({
      name,
      phone: phone || undefined,
      email: email || undefined,
      userId: session.user.id
    });

    return NextResponse.json({ contact: newContact });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Contact ID is required." }, { status: 400 });
    }

    await dbConnect();
    const result = await Contact.deleteOne({ _id: id, userId: session.user.id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
