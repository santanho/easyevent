import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Form, Input, Button, Card, Typography, Row, Col, message } from 'antd'; // <-- Import ส่วนประกอบ
import { UserOutlined, LockOutlined } from '@ant-design/icons'; // <-- Import ไอคอน

const { Title } = Typography;

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // AntD Form จะส่ง 'values' (ข้อมูลในฟอร์ม) มาให้เอง
  const onFinish = async (values) => {
    const { email, password } = values;

    const success = await login(email, password);
    if (success) {
      message.success('Login Successful!');
      navigate('/Easyevent/list');
    } else {
      message.error('Login Failed! Invalid email or password.');
    }
  };

  return (
    // จัดหน้าให้อยู่กลางจอ
    <Row justify="center" align="middle" style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Col xs={22} sm={16} md={12} lg={8}>
        <Card>
          <Title level={2} style={{ textAlign: 'center' }}>
            EasyEvent
          </Title>
          <Form
            name="normal_login"
            onFinish={onFinish} // <-- ใช้ onFinish แทน onSubmit
          >
            <Form.Item
              name="email" // <-- ต้องตรงกับ key ใน values
              rules={[{ required: true, message: 'Please input your Email!' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Email"
                type="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your Password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block> {/* block = ปุ่มเต็มความกว้าง */}
                Log in
              </Button>
            </Form.Item>

            <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
              <Link to="/register">Don't have an account? Register Now</Link>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default Login;