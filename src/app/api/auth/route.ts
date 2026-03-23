import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_mock_minisumo';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (body.username === 'admin' && body.password === 'admin') {
      const token = jwt.sign(
        { userId: 1, role: 'organizer', username: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return NextResponse.json({ token, success: true });
    }
    
    return NextResponse.json(
      { success: false, error: 'Credenciales inválidas' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Bad Request' },
      { status: 400 }
    );
  }
}
