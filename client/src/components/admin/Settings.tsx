import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, QrCode, Smartphone, CreditCard, CheckCircle, Wallet, Building, Ban, 
  Store, Palette, Clock, PauseCircle, XCircle, CheckCircle2, AlarmClock
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { generateQRCode } from '@/lib/qrcode';

// Helper function to get friendly name for PromptPay type
function getPromptPayTypeName(type: string): string {
  switch (type) {
    case 'phone':
      return 'เบอร์โทรศัพท์';
    case 'national_id':
      return 'เลขบัตรประชาชน';
    case 'bank_account':
      return 'บัญชีธนาคาร';
    case 'ewallet':
      return 'บัญชี e-Wallet';
    default:
      return 'ไม่ระบุ';
  }
}

// Define the schema for PromptPay validation
const promptPaySchema = z
  .object({
    promptpay_id: z.string().min(10, 'รหัสพร้อมเพย์ต้องมีอย่างน้อย 10 ตัวอักษร').max(20, 'รหัสพร้อมเพย์ต้องมีไม่เกิน 20 ตัวอักษร'),
    promptpay_type: z.enum(['phone', 'national_id'], {
      errorMap: () => ({ message: 'กรุณาเลือกประเภท' }),
    }),
  })
  .refine(
    (data) => {
      if (data.promptpay_type === 'phone') {
        // Phone number must be 10 digits
        return /^0\d{9}$/.test(data.promptpay_id);
      } else if (data.promptpay_type === 'national_id') {
        // National ID must be 13 digits
        return /^\d{13}$/.test(data.promptpay_id.replace(/-/g, ''));
      }
      return false;
    },
    {
      message: 'รูปแบบไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง',
      path: ['promptpay_id'],
    }
  );

// Define schema for store information
const storeInfoSchema = z.object({
  store_name: z.string().min(1, 'ชื่อร้านต้องไม่ว่างเปล่า').max(50, 'ชื่อร้านต้องไม่เกิน 50 ตัวอักษร'),
  store_theme: z.string().min(1, 'กรุณาเลือกธีม'),
  store_status: z.string().min(1, 'กรุณาเลือกสถานะร้าน'),
  phone_number: z.string().regex(/^0\d{9}$/, 'เบอร์โทรศัพท์ไม่ถูกต้อง ต้องเป็นเบอร์ 10 หลักขึ้นต้นด้วย 0'),
  address: z.string().min(1, 'ที่อยู่ต้องไม่ว่างเปล่า').max(200, 'ที่อยู่ต้องไม่เกิน 200 ตัวอักษร')
});

type PromptPayFormValues = z.infer<typeof promptPaySchema>;
type StoreInfoFormValues = z.infer<typeof storeInfoSchema>;

// Theme options
const themeOptions = [
  { value: 'hsl(142, 71%, 45%)', label: 'เขียว - สีธรรมชาติ', name: 'green' },
  { value: 'hsl(30, 35%, 33%)', label: 'น้ำตาล - สีกาแฟ', name: 'brown' },
  { value: 'hsl(210, 100%, 50%)', label: 'น้ำเงิน - สีสดใส', name: 'blue' },
  { value: 'hsl(0, 100%, 50%)', label: 'แดง - สีสด', name: 'red' },
  { value: 'hsl(280, 100%, 50%)', label: 'ม่วง - สีหรูหรา', name: 'purple' },
];

// Store status options
const storeStatusOptions = [
  { value: 'open', label: 'เปิดให้บริการ', color: 'bg-green-500', icon: CheckCircle2 },
  { value: 'busy', label: 'ให้บริการชั่วคราว (มีลูกค้าเยอะ)', color: 'bg-yellow-500', icon: AlarmClock },
  { value: 'close', label: 'ปิดให้บริการ', color: 'bg-red-500', icon: XCircle },
];

export default function Settings() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("store");
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [themeData, setThemeData] = useState<{
    primary: string;
    variant: string;
    appearance: string;
    radius: number;
  } | null>(null);
  const { toast } = useToast();
  
  // Initialize the store info form
  const storeForm = useForm<StoreInfoFormValues>({
    resolver: zodResolver(storeInfoSchema),
    defaultValues: {
      store_name: '',
      store_theme: 'green',
      store_status: 'open',
      phone_number: '',
      address: ''
    },
  });

  // Initialize the form
  const form = useForm<PromptPayFormValues>({
    resolver: zodResolver(promptPaySchema),
    defaultValues: {
      promptpay_id: '',
      promptpay_type: 'phone',
    },
  });

  // Fetch theme data from API
  useEffect(() => {
    const fetchThemeData = async () => {
      try {
        const response = await apiRequest('GET', '/api/theme');
        if (response.data) {
          setThemeData(response.data);
        }
      } catch (error) {
        console.error('Error fetching theme data:', error);
      }
    };
    
    fetchThemeData();
  }, []);

  // Fetch current settings when component mounts
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        // Fetch each setting separately to handle 404 errors for missing settings
        const fetchSetting = async (key: string) => {
          try {
            const response = await apiRequest('GET', `/api/settings/${key}`);
            return response.data?.value || null;
          } catch (error) {
            console.log(`Setting ${key} not found, using default value`);
            return null;
          }
        };
        
        // Get all settings
        const promptpayId = await fetchSetting('promptpay_id');
        const promptpayType = await fetchSetting('promptpay_type');
        const storeName = await fetchSetting('store_name');
        const storeTheme = await fetchSetting('store_theme');
        const storeStatus = await fetchSetting('store_status');
        const phoneNumber = await fetchSetting('phone_number');
        const address = await fetchSetting('address');

        // Set PromptPay form values
        form.reset({
          promptpay_id: promptpayId || '',
          promptpay_type: (promptpayType as 'phone' | 'national_id' | 'bank_account' | 'ewallet') || 'phone',
        });

        // Set Store Info form values
        storeForm.reset({
          store_name: storeName || 'คาเฟ่ของฉัน',
          store_theme: storeTheme || 'hsl(30, 35%, 33%)',
          store_status: storeStatus || 'open',
          phone_number: phoneNumber || '',
          address: address || '',
        });
      } catch (error) {
        console.error('Error fetching settings:', error);
        // We won't show a toast error here anymore since we're handling individual failures
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form, storeForm, toast]);

  // Submit handler for store information
  const onStoreSubmit = async (data: StoreInfoFormValues) => {
    setIsLoading(true);
    try {
      // Update all store settings
      await Promise.all([
        apiRequest('POST', '/api/settings', { 
          key: 'store_name', 
          value: data.store_name, 
          description: 'Store name' 
        }),
        apiRequest('POST', '/api/settings', { 
          key: 'store_theme', 
          value: data.store_theme, 
          description: 'Store theme color' 
        }),
        apiRequest('POST', '/api/settings', { 
          key: 'store_status', 
          value: data.store_status, 
          description: 'Store operational status' 
        }),
        apiRequest('POST', '/api/settings', { 
          key: 'phone_number', 
          value: data.phone_number, 
          description: 'Store contact phone number' 
        }),
        apiRequest('POST', '/api/settings', { 
          key: 'address', 
          value: data.address, 
          description: 'Store address' 
        }),
      ]);
      
      // Update the theme in the theme.json file
      const selectedOption = themeOptions.find(option => option.value === data.store_theme);
      
      if (themeData && selectedOption) {
        // Keep the existing theme data but update the primary color
        const updatedTheme = {
          ...themeData,
          primary: data.store_theme
        };
        
        // Send the updated theme to the API
        await apiRequest('POST', '/api/theme', updatedTheme);
      }

      toast({
        title: 'บันทึกสำเร็จ',
        description: 'บันทึกข้อมูลร้านและอัปเดตธีมเรียบร้อยแล้ว',
      });

      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/theme'] });
    } catch (error) {
      console.error('Error saving store settings:', error);
      toast({
        title: 'ข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลร้านได้',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit handler
  const onSubmit = async (data: PromptPayFormValues) => {
    setIsLoading(true);
    try {
      // Update both settings
      await Promise.all([
        apiRequest('POST', '/api/settings', { 
          key: 'promptpay_id', 
          value: data.promptpay_id, 
          description: 'PromptPay ID for QR code payments' 
        }),
        apiRequest('POST', '/api/settings', { 
          key: 'promptpay_type', 
          value: data.promptpay_type, 
          description: 'PromptPay ID type (phone or id_card)' 
        }),
      ]);

      toast({
        title: 'บันทึกสำเร็จ',
        description: 'บันทึกการตั้งค่า PromptPay เรียบร้อยแล้ว',
      });

      // Invalidate any QR code-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/settings/promptpay_id'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/promptpay_type'] });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'ข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกการตั้งค่าได้',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">ตั้งค่าร้าน</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="store" className="flex items-center">
            <Store className="mr-2 h-4 w-4" />
            ข้อมูลร้าน
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center">
            <Wallet className="mr-2 h-4 w-4" />
            การชำระเงิน
          </TabsTrigger>
        </TabsList>
        
        {/* ข้อมูลร้าน */}
        <TabsContent value="store" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลร้านค้า</CardTitle>
              <CardDescription>
                ตั้งค่าชื่อร้าน ที่อยู่ เบอร์โทรศัพท์ และธีมสีของร้าน
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...storeForm}>
                <form onSubmit={storeForm.handleSubmit(onStoreSubmit)} className="space-y-6">
                  <FormField
                    control={storeForm.control}
                    name="store_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อร้าน</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} placeholder="ชื่อร้านของคุณ" {...field} />
                        </FormControl>
                        <FormDescription>
                          ชื่อร้านที่จะแสดงในหน้าเว็บไซต์และใบเสร็จ
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={storeForm.control}
                      name="phone_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>เบอร์โทรศัพท์</FormLabel>
                          <FormControl>
                            <Input disabled={isLoading} placeholder="0812345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={storeForm.control}
                      name="store_theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ธีมสี</FormLabel>
                          <Select
                            disabled={isLoading}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกธีมสี" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {themeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center">
                                    <div 
                                      className="w-3 h-3 rounded-full mr-2" 
                                      style={{ 
                                        backgroundColor: option.value
                                      }}
                                    />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            สีหลักของร้านที่จะใช้ในเว็บไซต์และแอปพลิเคชัน
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={storeForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ที่อยู่</FormLabel>
                        <FormControl>
                          <Input disabled={isLoading} placeholder="ที่อยู่ร้าน" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={storeForm.control}
                    name="store_status"
                    render={({ field }) => (
                      <FormItem className="border p-4 rounded-lg mt-4">
                        <FormLabel className="text-base font-medium">สถานะร้าน</FormLabel>
                        <FormDescription className="text-sm">
                          เลือกสถานะที่จะแสดงให้ลูกค้าทราบว่าร้านเปิดให้บริการหรือไม่
                        </FormDescription>
                        <div className="mt-3">
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                            disabled={isLoading}
                          >
                            {storeStatusOptions.map((option) => {
                              const Icon = option.icon;
                              return (
                                <div key={option.value} className="flex">
                                  <RadioGroupItem
                                    value={option.value}
                                    id={`status-${option.value}`}
                                    className="peer sr-only"
                                  />
                                  <label
                                    htmlFor={`status-${option.value}`}
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 
                                      hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary 
                                      [&:has([data-state=checked])]:border-primary cursor-pointer w-full"
                                  >
                                    <Icon className={`mb-2 h-6 w-6 ${option.value === 'open' ? 'text-green-500' : option.value === 'busy' ? 'text-yellow-500' : 'text-red-500'}`} />
                                    <div className="text-center">
                                      <div className="text-sm font-medium">{option.label}</div>
                                    </div>
                                  </label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          บันทึกข้อมูลร้าน
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* การชำระเงิน */}
        <TabsContent value="payment" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>ตั้งค่าพร้อมเพย์</CardTitle>
              <CardDescription>
                ตั้งค่าบัญชีพร้อมเพย์สำหรับการชำระเงินด้วย QR Code (สามารถใช้ได้ทั้งเบอร์โทรศัพท์หรือรหัสบัตรประชาชน)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="promptpay_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ประเภทพร้อมเพย์</FormLabel>
                        <Select
                          disabled={isLoading}
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกประเภท" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="phone">หมายเลขโทรศัพท์</SelectItem>
                            <SelectItem value="national_id">เลขบัตรประชาชน</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="promptpay_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>รหัสพร้อมเพย์</FormLabel>
                        <FormControl>
                          <Input
                            disabled={isLoading}
                            placeholder={form.watch('promptpay_type') === 'phone' ? '0812345678' : '1234567890123'}
                            {...field}
                          />
                        </FormControl>
                        {(() => {
                          const promptpayType = form.watch('promptpay_type');
                          switch (promptpayType) {
                            case 'phone':
                              return (
                                <p className="text-xs text-muted-foreground mt-1">
                                  กรอกเบอร์โทรศัพท์ 10 หลัก เช่น 0812345678 (ไม่ต้องใส่ขีด หรือวรรค)
                                </p>
                              );
                            case 'national_id':
                              return (
                                <p className="text-xs text-muted-foreground mt-1">
                                  กรอกเลขบัตรประชาชน 13 หลัก เช่น 1234567890123 (ไม่ต้องใส่ขีด หรือวรรค)
                                </p>
                              );
                            default:
                              return null;
                          }
                        })()}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            กำลังบันทึก...
                          </>
                        ) : (
                          'บันทึกการตั้งค่า'
                        )}
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        disabled={isLoading}
                        onClick={async () => {
                          // Validate form first
                          const isValid = await form.trigger();
                          if (isValid) {
                            const values = form.getValues();
                            try {
                              // Generate sample QR code for display with the values from the form
                              const qrUrl = await generateQRCode(
                                100, // Sample amount of 100 baht
                                values.promptpay_id,
                                values.promptpay_type
                              );
                              setQrPreviewUrl(qrUrl);
                              setShowQrPreview(true);
                              toast({
                                title: "สร้าง QR Code ตัวอย่างสำเร็จ",
                                description: `สร้าง QR Code ตัวอย่างสำหรับ ${getPromptPayTypeName(values.promptpay_type)}: ${values.promptpay_id}`,
                              });
                            } catch (error) {
                              console.error(error);
                              toast({
                                title: "เกิดข้อผิดพลาด",
                                description: "ไม่สามารถสร้าง QR Code ตัวอย่างได้",
                                variant: "destructive"
                              });
                            }
                          }
                        }}
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        สร้าง QR ตัวอย่าง
                      </Button>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="destructive" 
                      className="w-full"
                      disabled={isLoading}
                      onClick={() => {
                        // Reset form to default values
                        form.reset({
                          promptpay_id: "",
                          promptpay_type: "phone",
                        });
                        
                        // Hide QR preview if visible
                        setShowQrPreview(false);
                        
                        toast({
                          title: "ยกเลิกการตั้งค่า",
                          description: "ล้างค่า PromptPay เรียบร้อยแล้ว กรุณาบันทึกการตั้งค่าเพื่อยืนยันการเปลี่ยนแปลง",
                          variant: "default"
                        });
                      }}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      ยกเลิกการตั้งค่า PromptPay
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
            {showQrPreview && qrPreviewUrl && (
              <CardFooter className="flex-col items-center">
                <div className="border rounded-md p-4 mb-2">
                  <h3 className="font-medium text-center mb-2">ตัวอย่าง QR Code</h3>
                  <div className="flex flex-col items-center">
                    <img 
                      src={qrPreviewUrl} 
                      alt="QR Code ตัวอย่าง" 
                      className="max-w-[200px] mb-2"
                    />
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      QR Code สำหรับตัวอย่างการชำระเงิน 100 บาท
                    </p>
                    <div className="flex items-center mt-2 text-sm text-muted-foreground">
                      {(() => {
                        const type = form.watch('promptpay_type');
                        switch (type) {
                          case 'phone':
                            return <Smartphone className="h-4 w-4 mr-1" />;
                          case 'national_id':
                            return <CreditCard className="h-4 w-4 mr-1" />;
                          default:
                            return <CreditCard className="h-4 w-4 mr-1" />;
                        }
                      })()}
                      <span>
                        {getPromptPayTypeName(form.watch('promptpay_type'))}: {form.watch('promptpay_id')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>พร้อมใช้งานกับระบบ QR Payment</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowQrPreview(false)}
                >
                  ซ่อนตัวอย่าง
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}