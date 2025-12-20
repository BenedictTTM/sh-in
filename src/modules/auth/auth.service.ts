import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  validateUser(username: string, password: string) {

    void username;
    void password;
    if (username === 'admin' && password === 'password') {
      return { id: 1, username: 'admin' };
    }
    return null;
  }
}
