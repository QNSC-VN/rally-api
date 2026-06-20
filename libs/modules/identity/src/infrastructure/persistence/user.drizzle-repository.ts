import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../domain/ports/user.repository';

@Injectable()
export class UserDrizzleRepository implements IUserRepository {
  async findByEmail(_email: string): Promise<null> { return null; }
  async findById(_id: string): Promise<null> { return null; }
  async save(_user: unknown): Promise<void> {}
}
