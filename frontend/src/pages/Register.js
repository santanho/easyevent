import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api'; // (ตัวยิง API ของเรา)
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Row,
  Col,
  message
} from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Register = () => {
  const navigate = useNavigate();

  // (เมื่อ "กด" ปุ่ม "Register")
  const onFinish = async (values) => {
    // (values = { name: "...", email: "...", password: "..." })

    // (เช็กว่า "รหัสผ่าน" ... ตรงกับ "ยืนยันรหัสผ่าน" ... หรือไม่)
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match!');
      return;
    }

    try {
      // 1. (ยิง API... ไปหา Backend ที่ "รอ" อยู่)
      await api.post('/api/auth/register', {
        name: values.name,
        email: values.email,
        password: values.password
      });

      // 2. (ถ้า "สำเร็จ")
      message.success('Registration successful! Please log in.');

      // 3. ( "ย้าย" (Navigate) ... กลับไปหน้า "Login" )
      navigate('/login');

    } catch (error) {
      // 4. (ถ้า "ไม่สำเร็จ" ... เช่น "อีเมลนี้ถูกใช้แล้ว")
      console.error('Registration failed:', error);
      message.error(error.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    // (เราใช้ "Layout" ... แบบเดียวกับหน้า "Login" ... เพื่อความสวยงาม)
    <Row justify="center" align="middle" style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Col xs={22} sm={16} md={12} lg={8}>
        <Card>
          <Title level={2} style={{ textAlign: 'center' }}>
            Register New Account
          </Title>
          <Form
            name="register"
            onFinish={onFinish}
          >
            {/* (1. ช่อง "ชื่อ" (Name)) */}
            <Form.Item
              name="name"
              rules={[{ required: true, message: 'Please input your Name!' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Full Name"
              />
            </Form.Item>

            {/* (2. ช่อง "อีเมล" (Email)) */}
            <Form.Item
              name="email"
              rules={[{ required: true, message: 'Please input your Email!', type: 'email' }]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Email"
              />
            </Form.Item>

            {/* (3. ช่อง "รหัสผ่าน" (Password)) */}
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your Password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
              />
            </Form.Item>

            {/* (4. ช่อง "ยืนยันรหัสผ่าน" (Confirm Password)) */}
            <Form.Item
              name="confirmPassword"
              dependencies={['password']} // (เช็กกับ "password")
              rules={[
                { required: true, message: 'Please confirm your Password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm Password"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Register
              </Button>
            </Form.Item>

            <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
              {/* (5. "ลิงก์" ... กลับไปหน้า "Login") */}
              <Link to="/login">Already have an account? Log in</Link>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default Register;