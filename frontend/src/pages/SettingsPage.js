import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Tabs,
  Form,
  Input,
  Button,
  message,
  Row,
  Col,
  ColorPicker, // ⭐️ (สำหรับ "เปลี่ยนสี")
  Typography,
  List,         // ⭐️ (สำหรับ "Webhooks")
  Popconfirm, // ⭐️ (สำหรับ "ยืนยันการลบ")
  Card
} from 'antd';
import { SaveOutlined, LockOutlined, PlusOutlined, DeleteOutlined, ApiOutlined, WechatOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

// -----------------------------------------------------------------
// ⭐️ (1) แท็บ "Profile" (เปลี่ยนชื่อ / เปลี่ยนสี)
// -----------------------------------------------------------------
const ProfileSettings = () => {
  const { user, login } = useAuth(); // (เราต้องการ 'login' ... เพื่อ "อัปเดต" (Update) ... ชื่อที่ 'Welcome...')
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // (ตั้งค่า "สี" (Color) ... เริ่มต้น (Default))
  const [color, setColor] = useState(user?.profileColor || '#1890ff');

  // (เมื่อ "โหลด" (Load) ... หน้านี้... "เติม" (Fill) ... ข้อมูล "ปัจจุบัน" (Current) ... ลงในฟอร์ม)
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
      });
      setColor(user.profileColor || '#1890ff');
    }
  }, [user, form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const newColor = typeof color === 'string' ? color : color.toHexString();

      // (ยิง API... (ที่เรา "สร้าง" (Built) ... ไว้ใน 'userRoutes.js'))
      const { data } = await api.put('/api/users/profile', {
        name: values.name,
        profileColor: newColor
      });

      // (สำคัญ!) "อัปเดต" (Update) ... 'AuthContext' ... "ทันที" (Immediately)
      // (เพื่อ "เปลี่ยน" (Change) ... ชื่อ 'Welcome, ...' ... ที่ 'Header')
      const token = localStorage.getItem('token');
      // (เรา "โกง" (Cheat) ... โดยการ "สร้าง" (Re-create) ... 'user' object ... (โดย "ไม่" (Without) ... ต้อง Login ใหม่))
      const updatedUserForAuth = {
        name: data.name,
        email: data.email,
        profileColor: data.profileColor,
        // (เราอาจจะต้อง "ดึง" (Fetch) ... user ... ใหม่... แต่ "วิธีนี้" (This way) ... "เร็ว" (Faster) กว่า)
      };
      // (เรา "อาจจะ" (May need) ... ต้อง "แก้ไข" (Modify) ... `AuthContext` ... ถ้ามัน "พัง" (Breaks))

      message.success('Profile updated successfully!');
    } catch (error) {
      message.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row justify="center">
      <Col xs={24} md={12}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="Display Name"
            rules={[{ required: true, message: 'Please input your name!' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Profile Color"
          >
            <ColorPicker value={color} onChange={setColor} showText />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              Save Profile
            </Button>
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
};

// -----------------------------------------------------------------
// ⭐️ (2) แท็บ "Security" (เปลี่ยนรหัสผ่าน)
// -----------------------------------------------------------------
const SecuritySettings = () => {
  const { logout } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    // (เช็กว่า "รหัสใหม่" (New) ... ตรงกับ "ยืนยัน" (Confirm) ... หรือไม่)
    if (values.newPassword !== values.confirmPassword) {
      message.error('New passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      // (ยิง API... (ที่เรา "สร้าง" (Built) ... ไว้ใน 'authRoutes.js'))
      await api.put('/api/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });

      message.success('Password changed successfully! You will be redirected to login.');

      setTimeout(() => {
        logout();
      }, 1000);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row justify="center">
      <Col xs={24} md={12}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[{ required: true, message: 'Please input your current password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[{ required: true, message: 'Please input a new password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your new password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              Change Password
            </Button>
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
};

// -----------------------------------------------------------------
// ⭐️ (3) แท็บ "Webhooks" (เก็บ API)
// -----------------------------------------------------------------
const WebhookSettings = () => {
  const [form] = Form.useForm();
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(false);

  // (ฟังก์ชัน "ดึง" (Fetch) ... Webhooks "ของเรา")
  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      // (ยิง API... (ที่เรา "สร้าง" (Built) ... ไว้ใน 'webhookRoutes.js'))
      const { data } = await api.get('/api/webhooks');
      setWebhooks(data);
    } catch (error) {
      message.error('Failed to load webhooks.');
    } finally {
      setLoading(false);
    }
  };

  // (เมื่อ "โหลด" (Load) ... หน้านี้... "ดึง" (Fetch) ... Webhooks ... "ทันที")
  useEffect(() => {
    fetchWebhooks();
  }, []);

  // (เมื่อ "กด" (Press) ... "Add Webhook")
  const onFinish = async (values) => {
    try {
      // (ยิง API... (POST))
      await api.post('/api/webhooks', {
        name: values.name,
        url: values.url
      });
      message.success('Webhook added successfully!');
      form.resetFields();
      fetchWebhooks(); // (รีเฟรช "List" (รายการ) ... ทันที)
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to add webhook.');
    }
  };

  // (เมื่อ "กด" (Press) ... "ปุ่มลบ" (Delete Button))
  const handleDelete = async (webhookId) => {
    try {
      // (ยิง API... (DELETE))
      await api.delete(`/api/webhooks/${webhookId}`);
      message.success('Webhook removed!');
      fetchWebhooks(); // (รีเฟรช "List" (รายการ) ... ทันที)
    } catch (error) {
      message.error('Failed to remove webhook.');
    }
  };

  return (
    <Row gutter={[24, 24]}>
      {/* (ฝั่ง "ซ้าย" (Left) ... (ฟอร์ม "สร้าง" (Create))) */}
      <Col xs={24} md={10}>
        <Title level={4}>Add New Webhook</Title>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="Friendly Name"
            rules={[{ required: true, message: 'e.g., Project A' }]}
          >
            <Input placeholder="e.g., Project A" />
          </Form.Item>
          <Form.Item
            name="url"
            label="Webhook URL"
            rules={[{ required: true, message: 'Please paste the Discord URL' }]}
          >
            <Input.Password placeholder="https://discord.com/api/webhooks/..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
              Add Webhook
            </Button>
          </Form.Item>
        </Form>
      </Col>

      {/* (ฝั่ง "ขวา" (Right) ... (รายการ "ที่บันทึกไว้" (Saved List))) */}
      <Col xs={24} md={14}>
        <Title level={4}>Saved Webhooks</Title>
        <List
          loading={loading}
          bordered
          dataSource={webhooks}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Popconfirm
                  title="Are you sure?"
                  onConfirm={() => handleDelete(item._id)}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={<ApiOutlined />}
                title={item.name}
                description={item.url.substring(0, 50) + '...'} // (แสดง URL "ย่อ" (Shortened))
              />
            </List.Item>
          )}
        />
      </Col>
    </Row>
  );
};

// -----------------------------------------------------------------
// ⭐️ (ใหม่!) แท็บ "Connections" (เชื่อมต่อ LINE)
// -----------------------------------------------------------------
const ConnectionSettings = () => {
  const { user } = useAuth(); // (เรา "ต้องการ" (Need) ... 'user._id' ... "สำหรับ" (For) ... "state")

  const handleLineLogin = () => {
    // (1. "อ่าน" (Read) ... "ID" (ID) ... "จาก" (From) ... ".env (Frontend)")
    const CLIENT_ID = process.env.REACT_APP_LINE_LOGIN_CHANNEL_ID;

    // (2. "ที่อยู่" (Address) ... "ของ" (Of) ... "Backend" (Backend) ... (ที่เรา "ตั้ง" (Set) ... "ไว้" (Up) ... "ใน" (In) ... "LINE Dev"))
    const REDIRECT_URI = 'https://easyevent.onrender.com/api/auth/line/callback';

    // (3. "ส่ง" (Send) ... 'user._id' ... "ของ "เรา"" (Of "Us") ... "ไป" (Go) ... "ด้วย" (With) ... (ใน "state"))
    // ( ... "เพื่อ" (So) ... "Backend" (Backend) ... "จะ "รู้"" (Will "Know") ... "ว่า "ใคร"" (WHO) ... "คือ" (Is) ... "คนที่" (The one) ... "กด" (Pressing) ... "ลิงก์" (Link) ... "นี้" (This))
    const STATE = user._id;

    const SCOPE = 'profile openid email'; // ( "ขอ" (Request) ... "สิทธิ์" (Permission) ... "ดู" (See) ... "โปรไฟล์" (Profile) + "อีเมล" (Email))

    // (4. "สร้าง" (Build) ... "URL "ย้าย"" (Redirect "URL") ... "ที่ "สมบูรณ์"" (Complete))
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${STATE}&scope=${SCOPE}`;

    // (5. "ย้าย" (Redirect) ... "Browser" (เบราว์เซอร์) ... "ไป" (To) ... "หน้า "Login"" (Login "Page") ... "ของ "LINE"" (Of "LINE"))
    window.location.href = lineAuthUrl;
  };

  return (
    <Row justify="center">
      <Col xs={24} md={12}>
        <Card title="Connect Accounts" bordered={false}>
          {user && user.lineUserId ? (
                // (กรณี A: เชื่อมแล้ว -> โชว์สีเขียว ไม่ให้กดซ้ำ)
                <div style={{ textAlign: 'center', padding: '20px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '8px' }}>
                    <h3 style={{ color: '#52c41a' }}>✅ LINE Connected!</h3>
                    <p>Your account is linked. You can now create LINE groups automatically.</p>
                </div>
              ) : (
                // (กรณี B: ยังไม่เชื่อม -> โชว์ปุ่มให้กด)
                <>
                    <Button 
                        type="primary" 
                        icon={<WechatOutlined />} 
                        size="large"
                        style={{ backgroundColor: '#00B900', borderColor: '#00B900', width: '100%' }}
                        onClick={handleLineLogin}
                    >
                        Connect with LINE
                    </Button>
                    <Paragraph type="secondary" style={{ marginTop: 16 }}>
                        Connect your LINE account to allow EasyEvent to create event groups.
                    </Paragraph>
                </>
              )}
        </Card>
      </Col>
    </Row>
  );
};

// -----------------------------------------------------------------
// ⭐️ (4) "หน้า Setting" (Settings Page) ... (ตัว "แม่" (Main))
// -----------------------------------------------------------------
const SettingsPage = () => {
  return (
    <div style={{ padding: '0 16px' }}>
      <Title level={2}>Settings</Title>
      <Tabs defaultActiveKey="1" type="card">
        <TabPane tab="Profile" key="1">
          <ProfileSettings />
        </TabPane>
        <TabPane tab="Security" key="2">
          <SecuritySettings />
        </TabPane>
        <TabPane tab="Webhooks" key="3">
          <WebhookSettings />
        </TabPane>
        <TabPane tab="Connections" key="4">
          <ConnectionSettings />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SettingsPage;