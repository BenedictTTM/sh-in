import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  validateUser(username: string, password: string) {
    // placeholder: implement real validation against DB
    void username;
    void password;
    if (username === 'admin' && password === 'password') {
      return { id: 1, username: 'admin' };
    }
    return null;
  }
}
